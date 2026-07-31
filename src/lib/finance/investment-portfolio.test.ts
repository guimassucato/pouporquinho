import { describe, expect, it } from "vitest";
import {
  computeInvestmentCurrentValue,
  computePortfolioSummary,
  latestValuationByInvestment,
} from "./investment-portfolio";

describe("latestValuationByInvestment", () => {
  it("picks the max-date valuation per investment from an out-of-order list", () => {
    const latest = latestValuationByInvestment([
      { investment_id: "a", valuation_date: "2026-03-01", total_value: 100 },
      { investment_id: "a", valuation_date: "2026-01-01", total_value: 50 },
      { investment_id: "b", valuation_date: "2026-02-01", total_value: 200 },
    ]);
    expect(latest.get("a")?.total_value).toBe(100);
    expect(latest.get("b")?.total_value).toBe(200);
  });
});

describe("computeInvestmentCurrentValue", () => {
  it("computes renda fixa via compound interest, ignoring valuations", () => {
    const investment = { id: "inv1", type: "renda_fixa", indexador: "prefixado", rate_percent: 12 };
    const value = computeInvestmentCurrentValue(
      investment,
      [{ investment_id: "inv1", type: "aporte", amount: 1000, transaction_date: "2026-01-01" }],
      { investment_id: "inv1", valuation_date: "2026-01-01", total_value: 999999 },
      [],
      "2026-07-01"
    );
    expect(value).toBeCloseTo(1000 * Math.pow(1.12, 181 / 365), 6);
  });

  it("falls back to net-contributed cost basis when a manual-valuation type has no valuation yet", () => {
    const investment = { id: "inv2", type: "renda_variavel", indexador: null, rate_percent: null };
    const value = computeInvestmentCurrentValue(
      investment,
      [
        { investment_id: "inv2", type: "aporte", amount: 300, transaction_date: "2026-01-01" },
        { investment_id: "inv2", type: "aporte", amount: 200, transaction_date: "2026-02-01" },
      ],
      undefined,
      [],
      "2026-07-01"
    );
    expect(value).toBe(500);
  });

  it("uses the latest manual valuation once one exists", () => {
    const investment = { id: "inv3", type: "cripto", indexador: null, rate_percent: null };
    const value = computeInvestmentCurrentValue(
      investment,
      [{ investment_id: "inv3", type: "aporte", amount: 100, transaction_date: "2026-01-01" }],
      { investment_id: "inv3", valuation_date: "2026-06-01", total_value: 250 },
      [],
      "2026-07-01"
    );
    expect(value).toBe(250);
  });
});

describe("computePortfolioSummary", () => {
  it("mixes renda-fixa computed values and manual-valuation values in one total, grouped by type", () => {
    const investments = [
      { id: "rf", type: "renda_fixa", indexador: "prefixado", rate_percent: 0 },
      { id: "rv", type: "renda_variavel", indexador: null, rate_percent: null },
    ];
    const transactions = [
      { investment_id: "rf", type: "aporte", amount: 1000, transaction_date: "2026-01-01" },
      { investment_id: "rv", type: "aporte", amount: 300, transaction_date: "2026-01-01" },
    ];
    const valuations = [
      { investment_id: "rv", valuation_date: "2026-06-01", total_value: 450 },
    ];

    const summary = computePortfolioSummary(
      investments,
      transactions,
      valuations,
      [],
      "2026-07-01"
    );

    expect(summary.totalInvested).toBe(1450); // 1000 (0% rate, unchanged) + 450
    expect(summary.byType.get("renda_fixa")).toBe(1000);
    expect(summary.byType.get("renda_variavel")).toBe(450);
    expect(summary.perInvestment.get("rv")?.accruedYield).toBe(150);
    expect(summary.perInvestment.get("rf")?.costBasis).toBe(1000);
  });
});
