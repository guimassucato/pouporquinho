import { describe, expect, it } from "vitest";
import { parseStatementText } from "./statement-parser";

describe("parseStatementText", () => {
  it("extracts transactions from typical DD/MM statement lines", () => {
    const text = [
      "05/01 UBER *TRIP                          25,90",
      "04/01 IFOOD *IFOOD                        58,00",
      "02/01 AMAZON.COM.BR                      120,00",
      "15/01 NETFLIX.COM                         39,90",
    ].join("\n");

    const result = parseStatementText(text, "2026-01-01");

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({
      date: "2026-01-05",
      description: "UBER *TRIP",
      amount: 25.9,
      isLikelyPayment: false,
    });
    expect(result[3]).toEqual({
      date: "2026-01-15",
      description: "NETFLIX.COM",
      amount: 39.9,
      isLikelyPayment: false,
    });
  });

  it("parses amounts with thousands separators", () => {
    const result = parseStatementText("10/01 MOVEIS PLANEJADOS  1.234,56", "2026-01-01");
    expect(result[0].amount).toBe(1234.56);
  });

  it("flags negative/credit lines as likely payments", () => {
    const text = [
      "20/12 PAGAMENTO EFETUADO             -450,00",
      "21/12 ESTORNO COMPRA CANCELADA        89,00 C",
    ].join("\n");

    const result = parseStatementText(text, "2026-01-01");

    expect(result).toHaveLength(2);
    expect(result[0].isLikelyPayment).toBe(true);
    expect(result[0].amount).toBe(450);
    expect(result[1].isLikelyPayment).toBe(true);
  });

  it("ignores lines without a valid date + amount pair", () => {
    const text = [
      "Total desta fatura                    1.500,00",
      "Limite disponível: R$ 2.000,00",
      "05/01 COMPRA VALIDA                     10,00",
    ].join("\n");

    const result = parseStatementText(text, "2026-01-01");
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("COMPRA VALIDA");
  });

  it("resolves the year across a billing cycle that crosses into a new year", () => {
    const text = ["28/12 COMPRA FIM DE ANO   200,00", "03/01 COMPRA ANO NOVO      50,00"].join(
      "\n"
    );

    const result = parseStatementText(text, "2026-01-01");
    expect(result[0].date).toBe("2025-12-28");
    expect(result[1].date).toBe("2026-01-03");
  });

  it("returns an empty array for text with no matching lines", () => {
    expect(parseStatementText("no transactions here", "2026-01-01")).toEqual([]);
  });

  it("parses text as actually produced by unpdf's extractText for a multi-run PDF table row", () => {
    // Captured from a synthetic PDF where date/description/amount are drawn
    // as separate Tj text runs on the same baseline (how table-based
    // statement PDFs typically render a row) and extracted via unpdf.
    const text =
      "05/01 UBER *TRIP 25,90\n" +
      "04/01 IFOOD *IFOOD 58,00\n" +
      "02/01 AMAZON.COM.BR 1.234,56\n" +
      "20/12 PAGAMENTO EFETUADO -450,00";

    const result = parseStatementText(text, "2026-01-01");

    expect(result).toEqual([
      { date: "2026-01-05", description: "UBER *TRIP", amount: 25.9, isLikelyPayment: false },
      { date: "2026-01-04", description: "IFOOD *IFOOD", amount: 58, isLikelyPayment: false },
      {
        date: "2026-01-02",
        description: "AMAZON.COM.BR",
        amount: 1234.56,
        isLikelyPayment: false,
      },
      {
        date: "2025-12-20",
        description: "PAGAMENTO EFETUADO",
        amount: 450,
        isLikelyPayment: true,
      },
    ]);
  });
});
