import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe seu email").email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Informe seu nome").max(80),
  email: z.string().trim().min(1, "Informe seu email").email("Email inválido"),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
});
