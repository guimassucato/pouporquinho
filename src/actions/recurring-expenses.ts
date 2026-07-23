"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recurringExpenseSchema } from "@/lib/validations/recurring-expenses";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof recurringExpenseSchema.parse>) {
  return {
    category_id: data.categoryId,
    payment_method_id: data.paymentMethodId,
    amount: data.amount,
    description: data.description,
    day_of_month: data.dayOfMonth,
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive,
  };
}

export async function createRecurringExpense(input: unknown): Promise<ActionResult> {
  const parsed = recurringExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("recurring_expenses")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/recurring");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateRecurringExpense(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = recurringExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("recurring_expenses")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/recurring");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteRecurringExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/recurring");
  revalidatePath("/expenses");
  return { success: true };
}
