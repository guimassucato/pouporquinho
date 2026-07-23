import { createClient } from "@/lib/supabase/server";
import { ensureRecurringExpensesForMonth } from "@/lib/finance/recurring";
import { ExpensesClient } from "./expenses-client";

function currentMonthIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function nextMonthIso(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return date.toISOString().slice(0, 10);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}-01$/.test(params.month)
    ? params.month
    : currentMonthIso();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureRecurringExpensesForMonth(supabase, user.id, month);
  }

  const [{ data: expenses }, { data: categories }, { data: paymentMethods }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .gte("expense_date", month)
        .lt("expense_date", nextMonthIso(month))
        .order("expense_date", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .eq("kind", "expense")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("payment_methods")
        .select("*")
        .eq("is_archived", false)
        .order("name"),
    ]);

  return (
    <ExpensesClient
      expenses={expenses ?? []}
      categories={categories ?? []}
      paymentMethods={paymentMethods ?? []}
      month={month}
    />
  );
}
