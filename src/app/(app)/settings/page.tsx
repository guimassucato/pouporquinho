import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: apiTokens }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
    supabase
      .from("api_tokens")
      .select("id, name, token_prefix, last_used_at, created_at")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <SettingsClient
      email={user?.email ?? ""}
      fullName={profile?.full_name ?? ""}
      apiTokens={apiTokens ?? []}
    />
  );
}
