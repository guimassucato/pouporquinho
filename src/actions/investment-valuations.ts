"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { investmentValuationSchema } from "@/lib/validations/investment-valuations";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof investmentValuationSchema.parse>) {
  return {
    investment_id: data.investmentId,
    valuation_date: data.valuationDate,
    total_value: data.totalValue,
    notes: data.notes || null,
  };
}

export async function createInvestmentValuation(input: unknown): Promise<ActionResult> {
  const parsed = investmentValuationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { data: investment } = await supabase
    .from("investments")
    .select("id, type")
    .eq("id", parsed.data.investmentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!investment) return { error: "Investimento inválido" };
  if (investment.type === "renda_fixa") {
    return {
      error:
        "Avaliações manuais não se aplicam a investimentos de renda fixa (o valor é calculado automaticamente).",
    };
  }

  const { error } = await supabase
    .from("investment_valuations")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma avaliação para essa data. Edite o valor existente."
          : error.message,
    };
  }

  revalidatePath("/investments");
  revalidatePath(`/investments/${parsed.data.investmentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateInvestmentValuation(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = investmentValuationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("investment_valuations")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Já existe uma avaliação para essa data. Edite o valor existente."
          : error.message,
    };
  }

  revalidatePath("/investments");
  revalidatePath(`/investments/${parsed.data.investmentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteInvestmentValuation(
  id: string,
  investmentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("investment_valuations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/investments");
  revalidatePath(`/investments/${investmentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
