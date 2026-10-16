import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Bypasses RLS. Only for server code that authenticates the caller some other
// way (e.g. API tokens) — every query made with it MUST filter by user_id.
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("SUPABASE_SECRET_KEY não configurada");

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
