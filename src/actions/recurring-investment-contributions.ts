"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { userOwnsRow } from "@/lib/supabase/ownership";
import { recurringInvestmentContributionSchema } from "@/lib/validations/recurring-investment-contributions";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof recurringInvestmentContributionSchema.parse>) {
  return {
    investment_id: data.investmentId,
    amount: data.amount,
    day_of_month: data.dayOfMonth,
    start_date: data.startDate,
    end_date: data.endDate || null,
    is_active: data.isActive,
  };
}

export async function createRecurringInvestmentContribution(
  input: unknown
): Promise<ActionResult> {
  const parsed = recurringInvestmentContributionSchema.safeParse(input);
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
    .from("recurring_investment_contributions")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath(`/investments/${parsed.data.investmentId}`);
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateRecurringInvestmentContribution(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = recurringInvestmentContributionSchema.safeParse(input);
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
    .from("recurring_investment_contributions")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/investments/${parsed.data.investmentId}`);
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteRecurringInvestmentContribution(
  id: string,
  investmentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("recurring_investment_contributions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/investments/${investmentId}`);
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { success: true };
}
