import { z } from "zod";

export const investmentTransactionSchema = z.object({
  investmentId: z.string().uuid("Selecione um investimento"),
  type: z.enum(["aporte", "resgate", "rendimento_reinvestido", "rendimento_sacado"]),
  amount: z.number().positive("Informe um valor maior que zero"),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type InvestmentTransactionInput = z.infer<typeof investmentTransactionSchema>;
