import { describe, expect, it } from "vitest";
import { getInvoiceMonth, getInvoicePeriod } from "./invoice";

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

describe("getInvoicePeriod", () => {
  it("spans the day after the previous closing through this month's closing", () => {
    expect(getInvoicePeriod("2026-03-01", 10, 17)).toEqual({
      start: "2026-02-11",
      closingDate: "2026-03-10",
      dueDate: "2026-03-17",
    });
  });

  it("puts the due date in the following month when due day <= closing day", () => {
    expect(getInvoicePeriod("2026-03-01", 28, 5)).toEqual({
      start: "2026-03-01",
      closingDate: "2026-03-28",
      dueDate: "2026-04-05",
    });
  });

  it("clamps a closing day of 31 in short months", () => {
    expect(getInvoicePeriod("2026-03-01", 31, 10)).toEqual({
      start: "2026-03-01",
      closingDate: "2026-03-31",
      dueDate: "2026-04-10",
    });
    expect(getInvoicePeriod("2026-02-01", 31, 10).closingDate).toBe("2026-02-28");
  });

  it("agrees with getInvoiceMonth for every day of the period", () => {
    const period = getInvoicePeriod("2026-03-01", 31, 10);
    const day = new Date(`${period.start}T00:00:00Z`);
    const end = new Date(`${period.closingDate}T00:00:00Z`);
    for (; day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
      expect(getInvoiceMonth(day, 31, 10).closingMonth.toISOString().slice(0, 10)).toBe(
        "2026-03-01"
      );
    }
    // The day before `start` belongs to the previous invoice.
    const before = new Date(`${period.start}T00:00:00Z`);
    before.setUTCDate(before.getUTCDate() - 1);
    expect(getInvoiceMonth(before, 31, 10).closingMonth.toISOString().slice(0, 10)).toBe(
      "2026-02-01"
    );
  });
});
