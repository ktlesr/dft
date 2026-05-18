import { z } from "zod";

const email = z
  .string({ required_error: "E-posta zorunludur." })
  // Trim BEFORE validating — accidental leading/trailing whitespace is
  // a common paste artefact and would otherwise fail the email regex.
  .trim()
  .email("Geçerli bir e-posta girin.")
  .transform((v) => v.toLowerCase());

/**
 * Login: yalnızca `ad.soyad` biçiminde kullanıcı adı kabul edilir.
 * E-posta ile giriş kapalıdır (Faz 9 sertleştirmesi).
 */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9.]{1,48}[a-z0-9])?$/;
const usernameInput = z
  .string({ required_error: "Kullanıcı adı zorunludur." })
  .trim()
  .min(3, "En az 3 karakter.")
  .max(50, "Çok uzun.")
  .transform((v) => v.toLowerCase())
  .refine(
    (v) => USERNAME_RE.test(v),
    "Geçerli bir kullanıcı adı girin (ör. ad.soyad).",
  );

const password = z
  .string({ required_error: "Şifre zorunludur." })
  .min(10, "Şifre en az 10 karakter olmalı.")
  .max(128, "Şifre çok uzun.")
  .refine((v) => /[a-z]/.test(v), "Küçük harf içermeli.")
  .refine((v) => /[A-Z]/.test(v), "Büyük harf içermeli.")
  .refine((v) => /[0-9]/.test(v), "Rakam içermeli.")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "En az bir özel karakter içermeli.");

export const loginSchema = z.object({
  // Form alan adı geriye dönük uyumluluk için `email` olarak kalır; içerik
  // artık daima `ad.soyad` biçiminde kullanıcı adıdır.
  email: usernameInput,
  password: z.string().min(1, "Şifre zorunludur."),
});

// Public signup was removed — DFT Portal is invite / admin-provisioning
// only. The `password` helper is still used below for password-reset.
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

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotInput = z.infer<typeof forgotSchema>;
export type ResetInput = z.infer<typeof resetSchema>;
