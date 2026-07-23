import { z } from "zod";

export const expenseSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria"),
  paymentMethodId: z.string().uuid("Selecione uma forma de pagamento"),
  amount: z.number().positive("Informe um valor maior que zero"),
  description: z.string().trim().min(1, "Informe uma descrição").max(120),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
