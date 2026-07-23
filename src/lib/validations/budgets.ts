import { z } from "zod";

export const budgetSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria"),
  month: z.string().regex(/^\d{4}-\d{2}-01$/, "Mês inválido"),
  amountLimit: z.number().positive("Informe um valor maior que zero"),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
