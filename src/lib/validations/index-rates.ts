import { z } from "zod";

export const indexRateSchema = z.object({
  indexador: z.enum(["cdi", "ipca", "selic"]),
  annualRatePercent: z.number().min(0, "Informe uma taxa válida").max(999.9999),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});

export type IndexRateInput = z.infer<typeof indexRateSchema>;
