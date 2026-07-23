"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validations/expenses";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof expenseSchema.parse>) {
  return {
    category_id: data.categoryId,
    payment_method_id: data.paymentMethodId,
    amount: data.amount,
    description: data.description,
    expense_date: data.expenseDate,
    notes: data.notes || null,
  };
}

export async function createExpense(input: unknown): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("expenses")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateExpense(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("expenses")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}
