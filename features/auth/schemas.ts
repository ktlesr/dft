import { z } from "zod";

const email = z
  .string({ required_error: "E-posta zorunludur." })
  .email("Geçerli bir e-posta girin.")
  .transform((v) => v.toLowerCase().trim());

const password = z
  .string({ required_error: "Şifre zorunludur." })
  .min(10, "Şifre en az 10 karakter olmalı.")
  .max(128, "Şifre çok uzun.")
  .refine((v) => /[a-z]/.test(v), "Küçük harf içermeli.")
  .refine((v) => /[A-Z]/.test(v), "Büyük harf içermeli.")
  .refine((v) => /[0-9]/.test(v), "Rakam içermeli.")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "En az bir özel karakter içermeli.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Şifre zorunludur."),
});

export const signupSchema = z
  .object({
    name: z
      .string({ required_error: "Ad soyad zorunludur." })
      .trim()
      .min(2, "Ad soyad çok kısa.")
      .max(100, "Ad soyad çok uzun."),
    organization: z.string().trim().max(120).optional(),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor.",
  });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({
    token: z.string().min(16, "Geçersiz bağlantı."),
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Şifreler eşleşmiyor.",
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
