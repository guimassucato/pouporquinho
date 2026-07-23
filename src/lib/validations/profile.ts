import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Informe seu nome").max(80),
});

export type ProfileInput = z.infer<typeof profileSchema>;
