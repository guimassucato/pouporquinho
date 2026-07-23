"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { incomeSchema } from "@/lib/validations/incomes";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof incomeSchema.parse>) {
  return {
    category_id: data.categoryId || null,
    amount: data.amount,
    description: data.description,
    income_date: data.incomeDate,
  };
}

export async function createIncome(input: unknown): Promise<ActionResult> {
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("incomes")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateIncome(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = incomeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("incomes")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("incomes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  return { success: true };
}
