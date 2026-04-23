"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createToken, hashToken } from "@/lib/tokens";
import { sendMail, passwordResetEmail, emailVerificationEmail } from "@/lib/mail";
import { forgotSchema, loginSchema, resetSchema, signupSchema } from "./schemas";

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: FormState = { ok: true };

function fieldErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

// ─── LOGIN ────────────────────────────────────────────────────────────

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`login:${ip}`, 10, 15 * 60_000);
  if (!rl.allowed) {
    return {
      ok: false,
      message: `Çok fazla deneme. ${rl.retryAfterSeconds} saniye sonra tekrar deneyin.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      if (code === "locked") {
        await audit({ action: "USER_LOGIN_FAILED", metadata: { reason: "locked", email: parsed.data.email } });
        return { ok: false, message: "Hesap geçici olarak kilitli. Biraz sonra tekrar deneyin." };
      }
      await audit({ action: "USER_LOGIN_FAILED", metadata: { email: parsed.data.email } });
      return { ok: false, message: "E-posta veya şifre hatalı." };
    }
    throw e;
  }

  // Resolve user to decide where to land.
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  await audit({ action: "USER_LOGIN", actorId: user?.id, metadata: { email: parsed.data.email } });

  if (user?.status === "PENDING_APPROVAL") redirect("/onay-bekleniyor");
  if (user?.status === "SUSPENDED" || user?.status === "REJECTED") redirect("/yetkisiz");
  redirect("/panel");
}

// ─── SIGNUP ───────────────────────────────────────────────────────────

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`signup:${ip}`, 5, 60 * 60_000);
  if (!rl.allowed) {
    return {
      ok: false,
      message: `Çok fazla başvuru. ${Math.ceil(rl.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`,
    };
  }

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    organization: formData.get("organization") ?? undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Return success regardless to avoid user enumeration. We still skip creation.
  if (existing) {
    await audit({
      action: "USER_SIGNUP",
      metadata: { email: parsed.data.email, duplicate: true },
    });
    return {
      ok: true,
      message: "Başvurunuz alındı. Onay sonrası giriş yapabileceksiniz.",
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      status: "PENDING_APPROVAL",
      profile: {
        create: { organization: parsed.data.organization ?? null },
      },
      roles: { create: { role: "USER" } },
    },
  });

  // Email verification token (Auth.js adapter-compatible VerificationToken table).
  const { token, tokenHash } = createToken();
  const expires = new Date(Date.now() + 24 * 60 * 60_000);
  await prisma.verificationToken.create({
    data: { identifier: parsed.data.email, token: tokenHash, expires },
  });

  const verifyLink = `${process.env.APP_URL ?? ""}/api/auth/dogrula?token=${token}&email=${encodeURIComponent(
    parsed.data.email,
  )}`;
  const { subject, text } = emailVerificationEmail(verifyLink);
  await sendMail({ to: parsed.data.email, subject, text });

  await audit({
    action: "USER_SIGNUP",
    actorId: user.id,
    metadata: { email: parsed.data.email },
  });

  return {
    ok: true,
    message:
      "Başvurunuz alındı. E-posta adresinize doğrulama bağlantısı gönderildi. Yönetici onayı sonrası portala erişebileceksiniz.",
  };
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────

export async function forgotAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`forgot:${ip}`, 6, 60 * 60_000);
  if (!rl.allowed) {
    return { ok: false, message: "Çok fazla istek. Daha sonra tekrar deneyin." };
  }

  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const { token, tokenHash } = createToken();
    await prisma.passwordResetToken.create({
      data: {
        email: parsed.data.email,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    });
    const link = `${process.env.APP_URL ?? ""}/sifre-sifirla/${token}`;
    const { subject, text } = passwordResetEmail(link);
    await sendMail({ to: parsed.data.email, subject, text });
  }

  // Always return success — avoid leaking whether the email exists.
  return {
    ok: true,
    message: "Bu e-posta ile kayıtlı bir hesap varsa, sıfırlama bağlantısı gönderildi.",
  };
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────

export async function resetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await getClientIp();
  const rl = await rateLimit(`reset:${ip}`, 10, 60 * 60_000);
  if (!rl.allowed) return { ok: false, message: "Çok fazla deneme." };

  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "Bağlantı geçersiz veya süresi dolmuş." };
  }

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user) return { ok: false, message: "Bağlantı geçersiz." };

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other pending reset tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { email: record.email, usedAt: null, tokenHash: { not: tokenHash } },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true, message: "Şifreniz güncellendi. Artık giriş yapabilirsiniz." };
}

// ─── SIGN OUT ─────────────────────────────────────────────────────────

export async function signOutAction(): Promise<void> {
  await audit({ action: "USER_LOGOUT" });
  await signOut({ redirectTo: "/giris" });
}
