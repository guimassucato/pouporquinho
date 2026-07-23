import { createClient } from "@/lib/supabase/server";
import { IncomesClient } from "./incomes-client";

function currentMonthIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function nextMonthIso(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return date.toISOString().slice(0, 10);
}

export default async function IncomesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}-01$/.test(params.month)
    ? params.month
    : currentMonthIso();

  const supabase = await createClient();

  const [{ data: incomes }, { data: categories }] = await Promise.all([
    supabase
      .from("incomes")
      .select("*")
      .gte("income_date", month)
      .lt("income_date", nextMonthIso(month))
      .order("income_date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("kind", "income")
      .eq("is_archived", false)
      .order("name"),
  ]);

  return (
    <IncomesClient
      incomes={incomes ?? []}
      categories={categories ?? []}
      month={month}
    />
  );
}
