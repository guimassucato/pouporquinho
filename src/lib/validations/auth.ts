import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe seu email").email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Informe seu nome").max(80),
  email: z.string().trim().min(1, "Informe seu email").email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
