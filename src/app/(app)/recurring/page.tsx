import { createClient } from "@/lib/supabase/server";
import { RecurringClient } from "./recurring-client";

export default async function RecurringPage() {
  const supabase = await createClient();

  const [
    { data: recurringExpenses },
    { data: recurringIncomes },
    { data: expenseCategories },
    { data: incomeCategories },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase.from("recurring_expenses").select("*").order("day_of_month"),
    supabase.from("recurring_incomes").select("*").order("day_of_month"),
    supabase
      .from("categories")
      .select("*")
      .eq("kind", "expense")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("categories")
      .select("*")
      .eq("kind", "income")
      .eq("is_archived", false)
      .order("name"),
    supabase.from("payment_methods").select("*").eq("is_archived", false).order("name"),
  ]);

  return (
    <RecurringClient
      recurringExpenses={recurringExpenses ?? []}
      recurringIncomes={recurringIncomes ?? []}
      expenseCategories={expenseCategories ?? []}
      incomeCategories={incomeCategories ?? []}
      paymentMethods={paymentMethods ?? []}
    />
  );
}
