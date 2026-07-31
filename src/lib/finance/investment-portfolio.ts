/**
 * Portfolio-level aggregation, built on top of investment-yield.ts. This is
 * the single source of truth for "what's this investment worth now" and
 * "what's the whole portfolio worth", shared by /investments and /dashboard
 * so the two pages never disagree.
 */
import type { Tables } from "@/types/database.types";
import {
  CASH_FLOW_SIGN,
  computeRendaFixaCurrentValue,
  type IndexRate,
  type Indexador,
  type InvestmentCashFlow,
  type InvestmentTransactionType,
} from "./investment-yield";

type InvestmentRow = Pick<Tables<"investments">, "id" | "type" | "indexador" | "rate_percent">;
type TransactionRow = Pick<
  Tables<"investment_transactions">,
  "investment_id" | "type" | "amount" | "transaction_date"
>;
type ValuationRow = Pick<
  Tables<"investment_valuations">,
  "investment_id" | "valuation_date" | "total_value"
>;
type IndexRateRow = Pick<Tables<"index_rates">, "indexador" | "annual_rate_percent" | "effective_from">;

function toIndexRates(rows: IndexRateRow[]): IndexRate[] {
  return rows.map((r) => ({
    indexador: r.indexador as Exclude<Indexador, "prefixado">,
    annualRatePercent: r.annual_rate_percent,
    effectiveFrom: r.effective_from,
  }));
}

function toCashFlows(rows: TransactionRow[]): InvestmentCashFlow[] {
  return rows.map((r) => ({
    type: r.type as InvestmentTransactionType,
    amount: r.amount,
    date: r.transaction_date,
  }));
}

function netContributed(cashFlows: InvestmentCashFlow[]): number {
  return cashFlows.reduce((sum, cf) => sum + CASH_FLOW_SIGN[cf.type] * cf.amount, 0);
}

/**
 * Reduces a (possibly out-of-order, multi-investment) list of manual
 * valuations down to the latest snapshot per investment.
 */
export function latestValuationByInvestment(
  valuations: ValuationRow[]
): Map<string, ValuationRow> {
  const latest = new Map<string, ValuationRow>();
  for (const v of valuations) {
    const current = latest.get(v.investment_id);
    if (!current || v.valuation_date > current.valuation_date) {
      latest.set(v.investment_id, v);
    }
  }
  return latest;
}

/**
 * Current value of a single investment. Renda fixa is computed via compound
 * interest; other types use the latest manual valuation, falling back to
 * net-contributed cost basis when no valuation has been entered yet (so a
 * brand-new position shows something sane before the user's first
 * check-in).
 */
export function computeInvestmentCurrentValue(
  investment: InvestmentRow,
  transactions: TransactionRow[],
  latestValuation: ValuationRow | undefined,
  indexRateHistory: IndexRateRow[],
  asOfDate: string
): number {
  const cashFlows = toCashFlows(transactions.filter((t) => t.investment_id === investment.id));

  if (investment.type === "renda_fixa") {
    return computeRendaFixaCurrentValue({
      indexador: investment.indexador as Indexador,
      ratePercent: investment.rate_percent as number,
      cashFlows,
      indexRateHistory: toIndexRates(indexRateHistory),
      asOfDate,
    });
  }

  if (latestValuation) return latestValuation.total_value;
  return Math.max(0, netContributed(cashFlows));
}

export type PortfolioSummary = {
  totalInvested: number;
  byType: Map<string, number>;
  perInvestment: Map<string, { currentValue: number; accruedYield: number; costBasis: number }>;
};

export function computePortfolioSummary(
  investments: InvestmentRow[],
  transactions: TransactionRow[],
  valuations: ValuationRow[],
  indexRateHistory: IndexRateRow[],
  asOfDate: string
): PortfolioSummary {
  const latestValuations = latestValuationByInvestment(valuations);
  const byType = new Map<string, number>();
  const perInvestment = new Map<
    string,
    { currentValue: number; accruedYield: number; costBasis: number }
  >();

  let totalInvested = 0;

  for (const investment of investments) {
    const investmentTransactions = transactions.filter(
      (t) => t.investment_id === investment.id
    );
    const currentValue = computeInvestmentCurrentValue(
      investment,
      investmentTransactions,
      latestValuations.get(investment.id),
      indexRateHistory,
      asOfDate
    );
    const costBasis = netContributed(toCashFlows(investmentTransactions));
    const accruedYield = currentValue - costBasis;

    perInvestment.set(investment.id, { currentValue, accruedYield, costBasis });
    byType.set(investment.type, (byType.get(investment.type) ?? 0) + currentValue);
    totalInvested += currentValue;
  }

  return { totalInvested, byType, perInvestment };
}
