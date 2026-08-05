import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./import-client";

export default async function ImportStatementPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: paymentMethods }] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .eq("kind", "expense")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("payment_methods")
      .select("*")
      .eq("kind", "credit")
      .eq("is_archived", false)
      .order("name"),
  ]);

  return (
    <ImportClient categories={categories ?? []} paymentMethods={paymentMethods ?? []} />
  );
}
