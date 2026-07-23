import { createClient } from "@/lib/supabase/server";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  return <CategoriesClient categories={categories ?? []} />;
}
