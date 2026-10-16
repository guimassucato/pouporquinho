import { z } from "zod";

export const apiTokenSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome").max(60),
});

export type ApiTokenInput = z.infer<typeof apiTokenSchema>;
