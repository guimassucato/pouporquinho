import { describe, expect, it } from "vitest";
import {
  compoundedGrowthFactor,
  computeAccruedYield,
  computeRendaFixaCurrentValue,
  type IndexRate,
} from "./investment-yield";

describe("computeRendaFixaCurrentValue", () => {
  it("compounds a single prefixado aporte over a known period", () => {
    const value = computeRendaFixaCurrentValue({
      indexador: "prefixado",
      ratePercent: 12,
      cashFlows: [{ type: "aporte", amount: 1000, date: "2026-01-01" }],
      indexRateHistory: [],
      asOfDate: "2026-07-01", // 181 days
    });
    const expected = 1000 * Math.pow(1.12, 181 / 365);
    expect(value).toBeCloseTo(expected, 6);
  });

  it("matches the equivalent prefixado rate for a flat 100% CDI position", () => {
    const history: IndexRate[] = [
      { indexador: "cdi", annualRatePercent: 11, effectiveFrom: "2025-01-01" },
    ];
    const cdiValue = computeRendaFixaCurrentValue({
      indexador: "cdi",
      ratePercent: 100,
      cashFlows: [{ type: "aporte", amount: 1000, date: "2026-01-01" }],
      indexRateHistory: history,
      asOfDate: "2026-07-01",
    });
    const prefixadoValue = computeRendaFixaCurrentValue({
      indexador: "prefixado",
      ratePercent: 11,
      cashFlows: [{ type: "aporte", amount: 1000, date: "2026-01-01" }],
      indexRateHistory: [],
      asOfDate: "2026-07-01",
    });
    expect(cdiValue).toBeCloseTo(prefixadoValue, 6);
  });

  it("applies the ipca spread convention (index + spread)", () => {
    const history: IndexRate[] = [
      { indexador: "ipca", annualRatePercent: 4, effectiveFrom: "2025-01-01" },
    ];
    const value = computeRendaFixaCurrentValue({
      indexador: "ipca",
      ratePercent: 6, // "IPCA + 6% a.a."
      cashFlows: [{ type: "aporte", amount: 1000, date: "2026-01-01" }],
      indexRateHistory: history,
      asOfDate: "2026-07-01",
    });
    const expected = 1000 * Math.pow(1.1, 181 / 365); // 4 + 6 = 10% a.a.
    expect(value).toBeCloseTo(expected, 6);
  });

  it("chains growth across a piecewise index-rate history", () => {
    const history: IndexRate[] = [
      { indexador: "cdi", annualRatePercent: 10, effectiveFrom: "2026-01-01" },
      { indexador: "cdi", annualRatePercent: 20, effectiveFrom: "2026-04-11" },
    ];
    const factor = compoundedGrowthFactor(
      "cdi",
      100,
      history,
      "2026-01-01",
      "2026-07-20"
    );
    // 2026-01-01 -> 2026-04-11 is 100 days at 10% a.a.;
    // 2026-04-11 -> 2026-07-20 is 100 days at 20% a.a.
    const expected = Math.pow(1.1, 100 / 365) * Math.pow(1.2, 100 / 365);
    expect(factor).toBeCloseTo(expected, 10);
  });

  it("falls back to the earliest known rate when the cash flow predates all history", () => {
    const history: IndexRate[] = [
      { indexador: "selic", annualRatePercent: 10.5, effectiveFrom: "2026-01-01" },
    ];
    const factor = compoundedGrowthFactor(
      "selic",
      100,
      history,
      "2025-01-01", // one year before the earliest record
      "2026-01-01"
    );
    const expected = Math.pow(1.105, 365 / 365);
    expect(factor).toBeCloseTo(expected, 6);
  });

  it("treats a resgate as a forward-compounding negative cash flow (aporte then resgate)", () => {
    const value = computeRendaFixaCurrentValue({
      indexador: "prefixado",
      ratePercent: 12,
      cashFlows: [
        { type: "aporte", amount: 1000, date: "2026-01-01" },
        { type: "resgate", amount: 500, date: "2027-01-01" }, // 365 days later
      ],
      indexRateHistory: [],
      asOfDate: "2028-01-01", // 730 days after the aporte
    });
    expect(value).toBeCloseTo(694.4, 1);
  });

  it("never returns a negative value", () => {
    const value = computeRendaFixaCurrentValue({
      indexador: "prefixado",
      ratePercent: 0,
      cashFlows: [
        { type: "aporte", amount: 100, date: "2026-01-01" },
        { type: "resgate", amount: 100, date: "2026-01-01" },
        { type: "resgate", amount: 50, date: "2026-01-02" },
      ],
      indexRateHistory: [],
      asOfDate: "2026-02-01",
    });
    expect(value).toBe(0);
  });
});

describe("computeAccruedYield", () => {
  it("is the current value minus net-contributed cash flows", () => {
    const yieldValue = computeAccruedYield(1100, [
      { type: "aporte", amount: 1000, date: "2026-01-01" },
    ]);
    expect(yieldValue).toBe(100);
  });

  it("accounts for resgates when computing accrued yield", () => {
    const yieldValue = computeAccruedYield(620, [
      { type: "aporte", amount: 1000, date: "2026-01-01" },
      { type: "resgate", amount: 500, date: "2027-01-01" },
    ]);
    expect(yieldValue).toBe(120);
  });
});
