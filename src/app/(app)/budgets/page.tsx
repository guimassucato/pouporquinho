import { createClient } from "@/lib/supabase/server";
import { BudgetsClient } from "./budgets-client";

function currentMonthIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}-01$/.test(params.month)
    ? params.month
    : currentMonthIso();

  const supabase = await createClient();

  const [{ data: budgets }, { data: categories }, { data: spentRows }] =
    await Promise.all([
      supabase.from("budgets").select("*").eq("month", month),
      supabase
        .from("categories")
        .select("*")
        .eq("kind", "expense")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("expenses_by_category_month")
        .select("category_id, total")
        .eq("month", month),
    ]);

  const spentByCategory: Record<string, number> = {};
  for (const row of spentRows ?? []) {
    if (row.category_id) spentByCategory[row.category_id] = row.total ?? 0;
  }

  return (
    <BudgetsClient
      budgets={budgets ?? []}
      categories={categories ?? []}
      spentByCategory={spentByCategory}
      month={month}
    />
  );
}
