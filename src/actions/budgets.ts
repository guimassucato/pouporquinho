"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { userOwnsRow } from "@/lib/supabase/ownership";
import { budgetSchema } from "@/lib/validations/budgets";

export type ActionResult = { error: string } | { success: true };

export async function createBudget(input: unknown): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (!(await userOwnsRow(supabase, "categories", parsed.data.categoryId, user.id))) {
    return { error: "Categoria inválida" };
  }

  const { error } = await supabase.from("budgets").insert({
    category_id: parsed.data.categoryId,
    month: parsed.data.month,
    amount_limit: parsed.data.amountLimit,
    user_id: user.id,
  });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe um orçamento para essa categoria neste mês"
          : error.message,
    };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateBudget(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (!(await userOwnsRow(supabase, "categories", parsed.data.categoryId, user.id))) {
    return { error: "Categoria inválida" };
  }

  const { error } = await supabase
    .from("budgets")
    .update({
      category_id: parsed.data.categoryId,
      month: parsed.data.month,
      amount_limit: parsed.data.amountLimit,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe um orçamento para essa categoria neste mês"
          : error.message,
    };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { success: true };
}
