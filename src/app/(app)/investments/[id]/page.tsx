import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvestmentDetailClient } from "./investment-detail-client";

export default async function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const asOfDate = new Date().toISOString().slice(0, 10);

  const supabase = await createClient();

  const { data: investment } = await supabase
    .from("investments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!investment) notFound();

  const [
    { data: transactions },
    { data: valuations },
    { data: indexRates },
    { data: recurringContributions },
  ] = await Promise.all([
    supabase
      .from("investment_transactions")
      .select("*")
      .eq("investment_id", id)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("investment_valuations")
      .select("*")
      .eq("investment_id", id)
      .order("valuation_date", { ascending: false }),
    supabase.from("index_rates").select("*"),
    supabase
      .from("recurring_investment_contributions")
      .select("*")
      .eq("investment_id", id),
  ]);

  return (
    <InvestmentDetailClient
      asOfDate={asOfDate}
      investment={investment}
      transactions={transactions ?? []}
      valuations={valuations ?? []}
      indexRates={indexRates ?? []}
      recurringContributions={recurringContributions ?? []}
    />
  );
}
