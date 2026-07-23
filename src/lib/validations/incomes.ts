import { z } from "zod";

export const incomeSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria").nullable().optional(),
  amount: z.number().positive("Informe um valor maior que zero"),
  description: z.string().trim().min(1, "Informe uma descrição").max(120),
  incomeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export type IncomeInput = z.infer<typeof incomeSchema>;
