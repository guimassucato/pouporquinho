import { z } from "zod";

export const investmentSchema = z
  .object({
    name: z.string().trim().min(1, "Informe um nome").max(60),
    type: z.enum(["renda_fixa", "renda_variavel", "fundo", "cripto", "previdencia"]),
    indexador: z.enum(["cdi", "ipca", "selic", "prefixado"]).nullable().optional(),
    // Can legitimately be 0 (e.g. an interest-free position) - refinements
    // below check `!= null`, never `!!ratePercent`.
    ratePercent: z.number().min(0).max(999.9999).nullable().optional(),
    institution: z.string().trim().max(60).nullable().optional(),
    ticker: z.string().trim().max(20).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  })
  .refine((data) => data.type !== "renda_fixa" || data.indexador != null, {
    message: "Informe o indexador",
    path: ["indexador"],
  })
  .refine((data) => data.type !== "renda_fixa" || data.ratePercent != null, {
    message: "Informe a taxa",
    path: ["ratePercent"],
  });

export type InvestmentInput = z.infer<typeof investmentSchema>;
