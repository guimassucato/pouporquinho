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
