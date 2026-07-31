"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { indexRateSchema } from "@/lib/validations/index-rates";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof indexRateSchema.parse>) {
  return {
    indexador: data.indexador,
    annual_rate_percent: data.annualRatePercent,
    effective_from: data.effectiveFrom,
  };
}

export async function createIndexRate(input: unknown): Promise<ActionResult> {
  const parsed = indexRateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("index_rates")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma taxa cadastrada para esse indexador nessa data."
          : error.message,
    };
  }

  revalidatePath("/investments/rates");
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateIndexRate(id: string, input: unknown): Promise<ActionResult> {
  const parsed = indexRateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("index_rates")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma taxa cadastrada para esse indexador nessa data."
          : error.message,
    };
  }

  revalidatePath("/investments/rates");
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteIndexRate(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("index_rates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/investments/rates");
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}
