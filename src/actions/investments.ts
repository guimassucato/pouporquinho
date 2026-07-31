"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { investmentSchema } from "@/lib/validations/investments";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof investmentSchema.parse>) {
  const isRendaFixa = data.type === "renda_fixa";
  return {
    name: data.name,
    type: data.type,
    indexador: isRendaFixa ? (data.indexador ?? null) : null,
    rate_percent: isRendaFixa ? (data.ratePercent ?? null) : null,
    institution: data.institution || null,
    ticker: data.ticker || null,
    notes: data.notes || null,
    start_date: data.startDate,
  };
}

export async function createInvestment(input: unknown): Promise<ActionResult> {
  const parsed = investmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("investments")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateInvestment(id: string, input: unknown): Promise<ActionResult> {
  const parsed = investmentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("investments")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath(`/investments/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setInvestmentArchived(
  id: string,
  isArchived: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("investments")
    .update({ is_archived: isArchived })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}
