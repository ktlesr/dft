"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createToken, hashToken } from "@/lib/tokens";
import { sendMail, passwordResetEmail } from "@/lib/mail";
import { notifyAdminsAboutNonAdminActivity } from "@/lib/notifications/admin-activity";
import { getNotificationPrefs } from "@/lib/notifications/notification-prefs";
import { forgotSchema, loginSchema, resetSchema } from "./schemas";

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

// --- LOGIN ---

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
  const loginIdentifier = parsed.data.email;

  try {
    await signIn("credentials", {
      email: loginIdentifier,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      const actor = await prisma.user.findUnique({
        where: { username: loginIdentifier },
        select: { id: true },
      });
      const code = (e as AuthError & { code?: string }).code;
      if (code === "locked") {
        await audit({
          action: "USER_LOGIN_FAILED",
          actorId: actor?.id,
          metadata: { reason: "locked", loginIdentifier },
        });
        return { ok: false, message: "Hesap geçici olarak kilitli. Biraz sonra kullanıcı adınızla tekrar deneyin." };
      }
      await audit({
        action: "USER_LOGIN_FAILED",
        actorId: actor?.id,
        metadata: { loginIdentifier },
      });
      return { ok: false, message: "Kullanıcı adı veya şifre hatalı." };
    }
    throw e;
  }

  // Resolve actor for audit using the login identifier (username).
  const user = await prisma.user.findUnique({
    where: { username: loginIdentifier },
    include: { roles: { select: { role: true } } },
  });
  await audit({
    action: "USER_LOGIN",
    actorId: user?.id,
    metadata: { loginIdentifier },
  });
  if (user) {
    // Admin'in /yonetim/ayarlar'dan açıp kapatabildiği toggle.
    // Form-create bildirimleri (doküman, KPI, vs.) bu bayrağa bağlı değil
    // — sadece login/logout zilini susturur.
    const prefs = await getNotificationPrefs();
    if (prefs.loginNotificationsEnabled) {
      await notifyAdminsAboutNonAdminActivity({
        actorId: user.id,
        actorRoles: user.roles.map((r) => r.role),
        actorName: user.name,
        actorEmail: user.email,
        kind: "login_admin",
        title: "Kullanıcı giriş yaptı",
        body: user.name?.trim() || user.email,
        link: "/yonetim/loglar",
      });
    }
  }

  if (user?.status === "PENDING_APPROVAL") redirect("/onay-bekleniyor");
  if (user?.status === "SUSPENDED" || user?.status === "REJECTED") redirect("/yetkisiz");
  redirect("/panel");
}

// --- SIGNUP ---
// Public signup was removed intentionally: DFT Portal is a closed system.
// Users are provisioned by admins through the invite flow (see
// `features/invites/actions.ts` -> acceptInvite) or created directly from
// the admin panel.

// --- FORGOT PASSWORD ---

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

  // Always return success - avoid leaking whether the email exists.
  return {
    ok: true,
    message: "Bu e-posta ile kayıtlı bir hesap varsa, sıfırlama bağlantısı gönderildi.",
  };
}

// --- RESET PASSWORD ---

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

// --- SIGN OUT ---

export async function signOutAction(): Promise<void> {
  const current = await getCurrentUser().catch(() => null);
  await audit({ action: "USER_LOGOUT", actorId: current?.id }).catch(() => undefined);

  if (current) {
    // Login ile aynı toggle'a bağlı; admin /yonetim/ayarlar'dan kapatabilir.
    // `await getNotificationPrefs()` veya `notifyAdmins...` her ne sebeple
    // çökerse çöksün signOut akışını bloklamamalıyız → tek `try/catch`.
    try {
      const prefs = await getNotificationPrefs();
      if (prefs.logoutNotificationsEnabled) {
        await notifyAdminsAboutNonAdminActivity({
          actorId: current.id,
          actorRoles: current.roles,
          actorName: current.name,
          actorEmail: current.email,
          kind: "logout_admin",
          title: "Kullanıcı çıkış yaptı",
          body: current.name?.trim() || current.email,
          link: "/yonetim/loglar",
        });
      }
    } catch {
      // bildirim sessizce atlanır — çıkış kullanıcı için akmaya devam etmeli
    }
  }

  try {
    await signOut({ redirectTo: "/giris" });
  } catch {
    redirect("/giris");
  }
}

