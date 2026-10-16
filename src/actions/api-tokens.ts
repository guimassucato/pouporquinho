"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateApiToken } from "@/lib/api-tokens";
import { apiTokenSchema } from "@/lib/validations/api-tokens";

export type ActionResult = { error: string } | { success: true };

// Returns the plaintext token exactly once; only its hash is persisted.
export async function createApiToken(
  input: unknown
): Promise<{ error: string } | { success: true; token: string }> {
  const parsed = apiTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { token, hash, prefix } = generateApiToken();

  const { error } = await supabase.from("api_tokens").insert({
    name: parsed.data.name,
    token_hash: hash,
    token_prefix: prefix,
    user_id: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true, token };
}

export async function deleteApiToken(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("api_tokens")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
