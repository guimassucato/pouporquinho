"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paymentMethodSchema } from "@/lib/validations/payment-methods";

export type ActionResult = { error: string } | { success: true };

function toRow(data: ReturnType<typeof paymentMethodSchema.parse>) {
  return {
    name: data.name,
    kind: data.kind,
    color: data.color,
    icon: data.icon,
    closing_day: data.kind === "credit" ? (data.closingDay ?? null) : null,
    due_day: data.kind === "credit" ? (data.dueDay ?? null) : null,
    credit_limit: data.kind === "credit" ? (data.creditLimit ?? null) : null,
  };
}

export async function createPaymentMethod(input: unknown): Promise<ActionResult> {
  const parsed = paymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("payment_methods")
    .insert({ ...toRow(parsed.data), user_id: user.id });

  if (error) return { error: error.message };

  revalidatePath("/payment-methods");
  return { success: true };
}

export async function updatePaymentMethod(
  id: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = paymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("payment_methods")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/payment-methods");
  return { success: true };
}

export async function setPaymentMethodArchived(
  id: string,
  isArchived: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("payment_methods")
    .update({ is_archived: isArchived })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/payment-methods");
  return { success: true };
}

export async function deletePaymentMethod(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("payment_methods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      error:
        error.code === "23503"
          ? "Essa forma de pagamento está em uso e não pode ser excluída. Arquive-a em vez disso."
          : error.message,
    };
  }

  revalidatePath("/payment-methods");
  return { success: true };
}
