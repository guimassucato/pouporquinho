import { z } from "zod";

export const importedTransactionSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria"),
  amount: z.number().positive("Informe um valor maior que zero"),
  description: z.string().trim().min(1, "Informe uma descrição").max(120),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export const importTransactionsSchema = z.object({
  paymentMethodId: z.string().uuid("Selecione uma forma de pagamento"),
  transactions: z.array(importedTransactionSchema).min(1, "Nenhum lançamento para importar").max(500),
});

export type ImportedTransactionInput = z.infer<typeof importedTransactionSchema>;
export type ImportTransactionsInput = z.infer<typeof importTransactionsSchema>;
