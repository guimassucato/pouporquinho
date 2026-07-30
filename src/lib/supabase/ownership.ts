import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// RLS already restricts selects to rows owned by the caller, so a hit here
// means the row both exists and belongs to `userId`.
export async function userOwnsRow(
  supabase: SupabaseClient<Database>,
  table: "categories" | "payment_methods",
  id: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return data !== null;
}
