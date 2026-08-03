"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { userOwnsRow } from "@/lib/supabase/ownership";
import { recurringIncomeSchema } from "@/lib/validations/recurring-incomes";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof recurringIncomeSchema.parse>) {
  return {
    category_id: data.categoryId || null,
    amount: data.amount,
    description: data.description,
    day_of_month: data.dayOfMonth,
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive,
  };
}

export async function createRecurringIncome(input: unknown): Promise<ActionResult> {
  const parsed = recurringIncomeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (
    parsed.data.categoryId &&
    !(await userOwnsRow(supabase, "categories", parsed.data.categoryId, user.id))
  ) {
    return { error: "Categoria inválida" };
  }

  const { error } = await supabase
    .from("recurring_incomes")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/recurring");
  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateRecurringIncome(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = recurringIncomeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (
    parsed.data.categoryId &&
    !(await userOwnsRow(supabase, "categories", parsed.data.categoryId, user.id))
  ) {
    return { error: "Categoria inválida" };
  }

  const { error } = await supabase
    .from("recurring_incomes")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/recurring");
  revalidatePath("/incomes");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteRecurringIncome(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("recurring_incomes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/recurring");
  revalidatePath("/incomes");
  return { success: true };
}
