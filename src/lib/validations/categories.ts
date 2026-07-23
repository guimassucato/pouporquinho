import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(60),
  kind: z.enum(["expense", "income"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  icon: z.string().min(1, "Selecione um ícone"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
