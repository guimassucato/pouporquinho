import { z } from "zod";

export const recurringIncomeSchema = z
  .object({
    categoryId: z.string().uuid("Selecione uma categoria").nullable().optional(),
    amount: z.number().positive("Informe um valor maior que zero"),
    description: z.string().trim().min(1, "Informe uma descrição").max(120),
    dayOfMonth: z.number().int().min(1).max(31),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
      .nullable()
      .optional(),
    isActive: z.boolean(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "A data final deve ser depois da data inicial",
    path: ["endDate"],
  });

export type RecurringIncomeInput = z.infer<typeof recurringIncomeSchema>;
