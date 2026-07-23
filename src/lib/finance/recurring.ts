import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

function clampDayToMonth(day: number, year: number, monthIndex: number): number {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(day, lastDay);
}

/**
 * Materializes recurring expenses into `expenses` for the given month,
 * idempotently (safe to call on every page load — relies on the
 * `expenses_recurring_month_uidx` unique index to skip rows already
 * generated for a given (recurrence, month) pair).
 */
export async function ensureRecurringExpensesForMonth(
  supabase: SupabaseClient<Database>,
  userId: string,
  monthIso: string
): Promise<void> {
  const [year, month] = monthIso.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  const { data: recurring } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("is_active", true)
    .lte("start_date", monthEnd)
    .or(`end_date.is.null,end_date.gte.${monthIso}`);

  if (!recurring || recurring.length === 0) return;

  const rows = recurring.map((r) => {
    const day = clampDayToMonth(r.day_of_month, year, month - 1);
    const expenseDate = `${monthIso.slice(0, 7)}-${String(day).padStart(2, "0")}`;
    return {
      user_id: userId,
      category_id: r.category_id,
      payment_method_id: r.payment_method_id,
      amount: r.amount,
      description: r.description,
      expense_date: expenseDate,
      recurring_expense_id: r.id,
      generated_for_month: monthIso,
    };
  });

  await supabase
    .from("expenses")
    .upsert(rows, {
      onConflict: "recurring_expense_id,generated_for_month",
      ignoreDuplicates: true,
    });
}
