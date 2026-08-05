"use server";

import { revalidatePath } from "next/cache";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { userOwnsRow } from "@/lib/supabase/ownership";
import { parseStatementText, type ParsedTransaction } from "@/lib/finance/statement-parser";
import { importTransactionsSchema } from "@/lib/validations/statement-import";

export type ActionResult = { error: string } | { success: true };

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export type ParsedTransactionRow = ParsedTransaction & { id: string };

export type ParseStatementResult =
  | { error: string }
  | { success: true; transactions: ParsedTransactionRow[] };

export async function parseStatementPdf(formData: FormData): Promise<ParseStatementResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const file = formData.get("file");
  const referenceMonth = formData.get("referenceMonth");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo PDF" };
  }
  if (typeof referenceMonth !== "string" || !/^\d{4}-\d{2}-01$/.test(referenceMonth)) {
    return { error: "Selecione o mês de referência da fatura" };
  }
  if (
    file.type &&
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return { error: "Envie um arquivo PDF" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "Arquivo muito grande (máx. 8MB)" };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const header = String.fromCharCode(...buffer.slice(0, 5));
  if (header !== "%PDF-") {
    return { error: "Arquivo não parece ser um PDF válido" };
  }

  let text: string;
  try {
    const pdf = await getDocumentProxy(buffer);
    const extracted = await extractText(pdf, { mergePages: true });
    text = extracted.text;
  } catch {
    return {
      error: "Não foi possível ler o PDF. Ele pode estar protegido por senha ou corrompido.",
    };
  }

  const transactions: ParsedTransactionRow[] = parseStatementText(text, referenceMonth).map(
    (transaction) => ({ ...transaction, id: crypto.randomUUID() })
  );

  if (transactions.length === 0) {
    return {
      error: "Nenhum lançamento reconhecido neste PDF. Tente lançar manualmente.",
    };
  }

  return { success: true, transactions };
}

export async function importTransactions(input: unknown): Promise<ActionResult> {
  const parsed = importTransactionsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (
    !(await userOwnsRow(supabase, "payment_methods", parsed.data.paymentMethodId, user.id))
  ) {
    return { error: "Forma de pagamento inválida" };
  }

  const categoryIds = [...new Set(parsed.data.transactions.map((t) => t.categoryId))];
  const { data: ownedCategories } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .in("id", categoryIds);

  const ownedCategoryIds = new Set((ownedCategories ?? []).map((c) => c.id));
  if (categoryIds.some((id) => !ownedCategoryIds.has(id))) {
    return { error: "Categoria inválida" };
  }

  const rows = parsed.data.transactions.map((t) => ({
    category_id: t.categoryId,
    payment_method_id: parsed.data.paymentMethodId,
    amount: t.amount,
    description: t.description,
    expense_date: t.expenseDate,
    notes: null,
    user_id: user.id,
  }));

  const { error } = await supabase.from("expenses").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}
