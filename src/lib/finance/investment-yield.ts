/**
 * Compound-interest math for renda fixa investments. Day counting uses
 * act/365 (`FV = PV * (1 + i)^(days/365)`), not the act/252 (business days)
 * convention used professionally for CDI-linked products - act/252 would
 * require a maintained Brazilian holiday calendar this app has no
 * infrastructure for. act/365 is a documented estimate for a personal
 * dashboard, not an authoritative/tax figure.
 */

export type Indexador = "cdi" | "ipca" | "selic" | "prefixado";

export type InvestmentTransactionType =
  | "aporte"
  | "resgate"
  | "rendimento_reinvestido"
  | "rendimento_sacado";

export type IndexRate = {
  indexador: Exclude<Indexador, "prefixado">;
  annualRatePercent: number;
  effectiveFrom: string; // ISO date (yyyy-mm-dd)
};

export type InvestmentCashFlow = {
  type: InvestmentTransactionType;
  amount: number;
  date: string; // ISO date (yyyy-mm-dd)
};

export const CASH_FLOW_SIGN: Record<InvestmentTransactionType, 1 | -1> = {
  aporte: 1,
  rendimento_reinvestido: 1,
  resgate: -1,
  rendimento_sacado: -1,
};

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / DAY_MS);
}

function growthFactor(annualRatePercent: number, days: number): number {
  return Math.pow(1 + annualRatePercent / 100, days / DAYS_PER_YEAR);
}

/**
 * Converts a stored `rate_percent` + indexador into the effective nominal
 * annual rate to compound with, given the index's own annual rate (ignored
 * for `prefixado`). Mirrors the rate_percent convention documented on the
 * `investments` table (migration 0012):
 *   prefixado   -> rate_percent IS the annual rate
 *   cdi/selic   -> rate_percent is a % OF the index annual rate (100 = 100% CDI)
 *   ipca        -> rate_percent is a spread ADDED to the index annual rate
 */
function effectiveAnnualRatePercent(
  indexador: Indexador,
  ratePercent: number,
  indexAnnualRatePercent: number
): number {
  if (indexador === "prefixado") return ratePercent;
  if (indexador === "ipca") return indexAnnualRatePercent + ratePercent;
  return indexAnnualRatePercent * (ratePercent / 100);
}

/**
 * Finds the annual rate in effect at `dateIso` for `indexador`. Falls back
 * to the earliest known rate when `dateIso` predates every record (flat
 * backward extrapolation - a documented estimate), and to 0% when no rate
 * has ever been recorded for this indexador.
 */
function rateInEffectAt(
  indexador: Exclude<Indexador, "prefixado">,
  dateIso: string,
  history: IndexRate[]
): number {
  const sorted = history
    .filter((r) => r.indexador === indexador)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));

  if (sorted.length === 0) return 0;

  const active = [...sorted].reverse().find((r) => r.effectiveFrom <= dateIso);
  return (active ?? sorted[0]).annualRatePercent;
}

/**
 * Compounds growth from `fromIso` to `asOfIso`, chaining across every
 * index-rate change in between (so a position that earned 100% CDI at 13%
 * a.a. until March and 10.5% a.a. after compounds correctly across the
 * boundary instead of using a single average rate).
 */
export function compoundedGrowthFactor(
  indexador: Indexador,
  ratePercent: number,
  indexRateHistory: IndexRate[],
  fromIso: string,
  asOfIso: string
): number {
  if (asOfIso <= fromIso) return 1;

  if (indexador === "prefixado") {
    return growthFactor(ratePercent, daysBetween(fromIso, asOfIso));
  }

  const boundaries = Array.from(
    new Set(
      indexRateHistory
        .filter(
          (r) =>
            r.indexador === indexador &&
            r.effectiveFrom > fromIso &&
            r.effectiveFrom < asOfIso
        )
        .map((r) => r.effectiveFrom)
    )
  ).sort();

  const segmentDates = [fromIso, ...boundaries, asOfIso];

  let factor = 1;
  for (let i = 0; i < segmentDates.length - 1; i++) {
    const segStart = segmentDates[i];
    const segEnd = segmentDates[i + 1];
    const days = daysBetween(segStart, segEnd);
    if (days <= 0) continue;
    const indexAnnualRate = rateInEffectAt(indexador, segStart, indexRateHistory);
    const annualRate = effectiveAnnualRatePercent(indexador, ratePercent, indexAnnualRate);
    factor *= growthFactor(annualRate, days);
  }
  return factor;
}

/**
 * Current value of a renda fixa position, computed by treating each
 * transaction as an independent signed cash flow that compounds forward
 * from its own date to `asOfDate` (aporte/rendimento_reinvestido = +,
 * resgate/rendimento_sacado = -), then summing.
 *
 * This is mathematically equivalent to "withdraw X and let the remainder
 * grow": compound growth is linear across a single pool earning one
 * uniform rate, so there's no distinction between "old" and "new" money in
 * a position. Example: R$1000 aporte at day 0, 12% a.a., resgate of R$500
 * at day 365 (balance right after = 1000*1.12 - 500 = 620); value at day
 * 730 = 620*1.12 = 694.40, and the formula gives the same result directly:
 * 1000*1.12^(730/365) - 500*1.12^(365/365) = 1254.40 - 560 = 694.40.
 */
export function computeRendaFixaCurrentValue({
  indexador,
  ratePercent,
  cashFlows,
  indexRateHistory,
  asOfDate,
}: {
  indexador: Indexador;
  ratePercent: number;
  cashFlows: InvestmentCashFlow[];
  indexRateHistory: IndexRate[];
  asOfDate: string;
}): number {
  const total = cashFlows
    .filter((cf) => cf.date <= asOfDate)
    .reduce((sum, cf) => {
      const growth = compoundedGrowthFactor(
        indexador,
        ratePercent,
        indexRateHistory,
        cf.date,
        asOfDate
      );
      return sum + CASH_FLOW_SIGN[cf.type] * cf.amount * growth;
    }, 0);

  return Math.max(0, total);
}

/** "Rendimento acumulado": current value minus everything put in net of what came out. */
export function computeAccruedYield(
  currentValue: number,
  cashFlows: InvestmentCashFlow[]
): number {
  const netContributed = cashFlows.reduce(
    (sum, cf) => sum + CASH_FLOW_SIGN[cf.type] * cf.amount,
    0
  );
  return currentValue - netContributed;
}
