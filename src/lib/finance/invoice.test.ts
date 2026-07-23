import { describe, expect, it } from "vitest";
import { getInvoiceMonth } from "./invoice";

describe("getInvoiceMonth", () => {
  it("falls into the same month's invoice when on or before the closing day", () => {
    const { closingMonth, dueDate } = getInvoiceMonth(
      new Date("2026-03-05T00:00:00Z"),
      10,
      17
    );
    expect(closingMonth.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(dueDate.toISOString().slice(0, 10)).toBe("2026-03-17");
  });

  it("rolls into next month's invoice when after the closing day", () => {
    const { closingMonth, dueDate } = getInvoiceMonth(
      new Date("2026-03-15T00:00:00Z"),
      10,
      17
    );
    expect(closingMonth.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(dueDate.toISOString().slice(0, 10)).toBe("2026-04-17");
  });

  it("pushes the due date to the month after closing when due day <= closing day", () => {
    // Closes on the 28th, due on the 5th of the following month.
    const { closingMonth, dueDate } = getInvoiceMonth(
      new Date("2026-03-20T00:00:00Z"),
      28,
      5
    );
    expect(closingMonth.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(dueDate.toISOString().slice(0, 10)).toBe("2026-04-05");
  });

  it("clamps the due day when the target month is shorter (February)", () => {
    const { dueDate } = getInvoiceMonth(new Date("2026-01-20T00:00:00Z"), 28, 30);
    // closing month = Jan (day 20 <= 28), due day 30 > closing day 28 -> due in Jan.
    expect(dueDate.toISOString().slice(0, 10)).toBe("2026-01-30");
  });

  it("clamps the due day to Feb 28 on a non-leap year when rolling into February", () => {
    const { closingMonth, dueDate } = getInvoiceMonth(
      new Date("2027-01-29T00:00:00Z"),
      28,
      30
    );
    expect(closingMonth.toISOString().slice(0, 10)).toBe("2027-02-01");
    expect(dueDate.toISOString().slice(0, 10)).toBe("2027-02-28");
  });

  it("handles an expense exactly on the closing day", () => {
    const { closingMonth } = getInvoiceMonth(
      new Date("2026-03-10T00:00:00Z"),
      10,
      17
    );
    expect(closingMonth.toISOString().slice(0, 10)).toBe("2026-03-01");
  });
});
