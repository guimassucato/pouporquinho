"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { userOwnsRow } from "@/lib/supabase/ownership";
import { investmentTransactionSchema } from "@/lib/validations/investment-transactions";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof investmentTransactionSchema.parse>) {
  return {
    investment_id: data.investmentId,
    type: data.type,
    amount: data.amount,
    transaction_date: data.transactionDate,
    notes: data.notes || null,
  };
}

export async function createInvestmentTransaction(input: unknown): Promise<ActionResult> {
  const parsed = investmentTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (!(await userOwnsRow(supabase, "investments", parsed.data.investmentId, user.id))) {
    return { error: "Investimento inválido" };
  }

  const { error } = await supabase
    .from("investment_transactions")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath(`/investments/${parsed.data.investmentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateInvestmentTransaction(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = investmentTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (!(await userOwnsRow(supabase, "investments", parsed.data.investmentId, user.id))) {
    return { error: "Investimento inválido" };
  }

  const { error } = await supabase
    .from("investment_transactions")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath(`/investments/${parsed.data.investmentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteInvestmentTransaction(
  id: string,
  investmentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("investment_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath(`/investments/${investmentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
