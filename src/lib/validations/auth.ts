import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "";
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

export const isDemoEnabled =
  (process.env.NEXT_PUBLIC_DEMO_MODE ?? "false").toLowerCase() === "true";
