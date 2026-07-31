import { z } from "zod";

export const investmentValuationSchema = z.object({
  investmentId: z.string().uuid("Selecione um investimento"),
  valuationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  // 0 is a valid value (a wiped-out position) - do not use `!!totalValue`.
  totalValue: z.number().min(0, "Informe um valor válido"),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type InvestmentValuationInput = z.infer<typeof investmentValuationSchema>;
