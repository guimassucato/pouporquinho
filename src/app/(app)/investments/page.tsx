import { createClient } from "@/lib/supabase/server";
import { ensureRecurringInvestmentContributionsForMonth } from "@/lib/finance/investment-recurring";
import { InvestmentsClient } from "./investments-client";

function currentMonthIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function InvestmentsPage() {
  const asOfDate = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await ensureRecurringInvestmentContributionsForMonth(
      supabase,
      user.id,
      currentMonthIso()
    );
  }

  const [
    { data: investments },
    { data: transactions },
    { data: valuations },
    { data: indexRates },
    { data: recurringContributions },
  ] = await Promise.all([
    supabase.from("investments").select("*").order("name"),
    supabase.from("investment_transactions").select("*"),
    supabase.from("investment_valuations").select("*"),
    supabase.from("index_rates").select("*"),
    supabase
      .from("recurring_investment_contributions")
      .select("*")
      .eq("is_active", true),
  ]);

  return (
    <InvestmentsClient
      asOfDate={asOfDate}
      investments={investments ?? []}
      transactions={transactions ?? []}
      valuations={valuations ?? []}
      indexRates={indexRates ?? []}
      recurringContributions={recurringContributions ?? []}
    />
  );
}
