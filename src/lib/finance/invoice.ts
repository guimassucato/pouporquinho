/**
 * Given the day a credit card expense happened and the card's closing/due
 * days, returns which invoice (billing cycle) it falls into.
 *
 * Rule: an expense on or before the closing day belongs to that month's
 * invoice; after the closing day it rolls into next month's invoice. The
 * invoice is due the same month it closes if the due day comes after the
 * closing day, otherwise it's due the following month.
 */
export function getInvoiceMonth(
  expenseDate: Date,
  closingDay: number,
  dueDay: number
): { closingMonth: Date; dueDate: Date } {
  const day = expenseDate.getUTCDate();

  const closingMonth = new Date(
    Date.UTC(expenseDate.getUTCFullYear(), expenseDate.getUTCMonth(), 1)
  );
  if (day > closingDay) {
    closingMonth.setUTCMonth(closingMonth.getUTCMonth() + 1);
  }

  const dueMonth = new Date(closingMonth);
  if (dueDay <= closingDay) {
    dueMonth.setUTCMonth(dueMonth.getUTCMonth() + 1);
  }

  const dueDate = new Date(
    Date.UTC(dueMonth.getUTCFullYear(), dueMonth.getUTCMonth(), 1)
  );
  dueDate.setUTCDate(clampDayToMonth(dueDay, dueDate));

  return { closingMonth, dueDate };
}

function clampDayToMonth(day: number, monthStart: Date): number {
  const lastDayOfMonth = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return Math.min(day, lastDayOfMonth);
}

/**
 * The billing period of the invoice that closes in `closingMonthIso`
 * ("YYYY-MM-01"): purchases from `start` through `closingDate` (inclusive),
 * due on `dueDate`. Closing days past the end of a short month clamp to its
 * last day, consistent with getInvoiceMonth.
 */
export function getInvoicePeriod(
  closingMonthIso: string,
  closingDay: number,
  dueDay: number
): { start: string; closingDate: string; dueDate: string } {
  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  const closingDateOf = (monthStart: Date) => {
    const date = new Date(monthStart);
    date.setUTCDate(clampDayToMonth(closingDay, monthStart));
    return date;
  };

  const monthStart = new Date(`${closingMonthIso.slice(0, 7)}-01T00:00:00Z`);
  const closingDate = closingDateOf(monthStart);

  const previousMonthStart = new Date(monthStart);
  previousMonthStart.setUTCMonth(previousMonthStart.getUTCMonth() - 1);
  const start = closingDateOf(previousMonthStart);
  start.setUTCDate(start.getUTCDate() + 1);

  return {
    start: toIso(start),
    closingDate: toIso(closingDate),
    dueDate: toIso(getInvoiceMonth(closingDate, closingDay, dueDay).dueDate),
  };
}
