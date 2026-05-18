import { z } from "zod";

const email = z
  .string({ required_error: "E-posta zorunludur." })
  // Trim BEFORE validating — accidental leading/trailing whitespace is
  // a common paste artefact and would otherwise fail the email regex.
  .trim()
  .email("Geçerli bir e-posta girin.")
  .transform((v) => v.toLowerCase());

/**
 * Login için "e-posta VEYA ad.soyad biçiminde kullanıcı adı" kabul eder.
 * Sunucu tarafında "@" varsa katı email doğrulamasından, yoksa
 * kullanıcı adı regex'inden geçer.
 */
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9.]{1,48}[a-z0-9])?$/;
const emailOrUsername = z
  .string({ required_error: "E-posta veya kullanıcı adı zorunludur." })
  .trim()
  .min(3, "En az 3 karakter.")
  .max(254, "Çok uzun.")
  .transform((v) => v.toLowerCase())
  .superRefine((v, ctx) => {
    const ok = v.includes("@")
      ? z.string().email().safeParse(v).success
      : USERNAME_RE.test(v);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Geçerli bir e-posta veya kullanıcı adı girin.",
      });
    }
  });

const password = z
  .string({ required_error: "Şifre zorunludur." })
  .min(10, "Şifre en az 10 karakter olmalı.")
  .max(128, "Şifre çok uzun.")
  .refine((v) => /[a-z]/.test(v), "Küçük harf içermeli.")
  .refine((v) => /[A-Z]/.test(v), "Büyük harf içermeli.")
  .refine((v) => /[0-9]/.test(v), "Rakam içermeli.")
  .refine((v) => /[^A-Za-z0-9]/.test(v), "En az bir özel karakter içermeli.");

export const loginSchema = z.object({
  // İstemcide hala `email` adıyla taşınıyor (form alanı), ama içerik
  // e-posta veya kullanıcı adı olabilir. Sunucu authorize tarafında ayrılır.
  email: emailOrUsername,
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
