import { createClient } from "@/lib/supabase/server";
import { RatesClient } from "./rates-client";

export default async function IndexRatesPage() {
  const supabase = await createClient();
  const { data: indexRates } = await supabase
    .from("index_rates")
    .select("*")
    .order("indexador")
    .order("effective_from", { ascending: false });

  return <RatesClient indexRates={indexRates ?? []} />;
}
