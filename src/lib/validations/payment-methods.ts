import { z } from "zod";

export const paymentMethodSchema = z
  .object({
    name: z.string().trim().min(1, "Informe um nome").max(60),
    kind: z.enum(["cash", "debit", "credit", "pix", "other"]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
    icon: z.string().min(1, "Selecione um ícone"),
    closingDay: z.number().int().min(1).max(31).nullable().optional(),
    dueDay: z.number().int().min(1).max(31).nullable().optional(),
    creditLimit: z.number().positive().nullable().optional(),
  })
  .refine((data) => data.kind !== "credit" || !!data.closingDay, {
    message: "Informe o dia de fechamento da fatura",
    path: ["closingDay"],
  })
  .refine((data) => data.kind !== "credit" || !!data.dueDay, {
    message: "Informe o dia de vencimento da fatura",
    path: ["dueDay"],
  });

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
