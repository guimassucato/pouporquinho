import { createClient } from "@/lib/supabase/server";
import { ensureRecurringExpensesForMonth } from "@/lib/finance/recurring";
import { ensureRecurringIncomesForMonth } from "@/lib/finance/income-recurring";
import { ensureRecurringInvestmentContributionsForMonth } from "@/lib/finance/investment-recurring";
import { DashboardClient } from "./dashboard-client";

function currentMonthIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthsBack(monthIso: string, count: number) {
  const [year, month] = monthIso.split("-").map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(year, month - 1 - i, 1));
    months.push(date.toISOString().slice(0, 10));
  }
  return months;
}

export default async function DashboardPage() {
  const month = currentMonthIso();
  const trendMonths = monthsBack(month, 6);
  const earliestMonth = trendMonths[0];

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureRecurringExpensesForMonth(supabase, user.id, month);
    await ensureRecurringIncomesForMonth(supabase, user.id, month);
    await ensureRecurringInvestmentContributionsForMonth(supabase, user.id, month);
  }

  const asOfDate = new Date().toISOString().slice(0, 10);

  const [
    { data: categories },
    { data: paymentMethods },
    { data: expensesByCategory },
    { data: expensesByPaymentMethod },
    { data: cashflow },
    { data: budgets },
    { data: investments },
    { data: investmentTransactions },
    { data: investmentValuations },
    { data: indexRates },
  ] = await Promise.all([
    supabase.from("categories").select("*"),
    supabase.from("payment_methods").select("*"),
    supabase
      .from("expenses_by_category_month")
      .select("category_id, total")
      .eq("month", month),
    supabase
      .from("expenses_by_payment_method_month")
      .select("payment_method_id, total")
      .eq("month", month),
    supabase
      .from("monthly_cashflow")
      .select("month, income_total, expense_total")
      .gte("month", earliestMonth)
      .lte("month", month)
      .order("month"),
    supabase.from("budgets").select("*").eq("month", month),
    // Unfiltered by month - the compound-interest math needs full history.
    supabase.from("investments").select("*").eq("is_archived", false),
    supabase.from("investment_transactions").select("*"),
    supabase.from("investment_valuations").select("*"),
    supabase.from("index_rates").select("*"),
  ]);

  return (
    <DashboardClient
      month={month}
      trendMonths={trendMonths}
      asOfDate={asOfDate}
      categories={categories ?? []}
      paymentMethods={paymentMethods ?? []}
      expensesByCategory={expensesByCategory ?? []}
      expensesByPaymentMethod={expensesByPaymentMethod ?? []}
      cashflow={cashflow ?? []}
      budgets={budgets ?? []}
      investments={investments ?? []}
      investmentTransactions={investmentTransactions ?? []}
      investmentValuations={investmentValuations ?? []}
      indexRates={indexRates ?? []}
    />
  );
}
