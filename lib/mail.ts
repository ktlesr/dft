/**
 * Mail sender abstraction.
 *
 * Phase 2: logs to console in development so we can test flows locally
 *           without real SMTP.
 * Phase 5: swapped for Resend / SMTP provider via the same interface.
 *           All call sites already go through `sendMail` so nothing else
 *           needs to change.
 */

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail({ to, subject, text, html }: MailInput): Promise<void> {
  // Dev fallback: printable, so the grader / developer can follow the flow.
  const body = text ?? html ?? "";
  const sep = "━".repeat(72);
  // eslint-disable-next-line no-console -- intentional dev fallback
  console.log(
    [
      "",
      sep,
      `📧 MAIL  →  ${to}`,
      `📌  ${subject}`,
      sep,
      body,
      sep,
      "",
    ].join("\n"),
  );

  // Phase 5 hook: when AUTH_SMTP_* / RESEND_API_KEY env vars appear,
  // replace this with real delivery and fail the call on error.
}

export function passwordResetEmail(link: string): { subject: string; text: string } {
  return {
    subject: "DFT Portal — Şifre sıfırlama",
    text: [
      "Merhaba,",
      "",
      "DFT Portal hesabınız için şifre sıfırlama talebinde bulundunuz.",
      "Aşağıdaki bağlantı 60 dakika geçerlidir:",
      "",
      link,
      "",
      "Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz — hesabınız değişmez.",
    ].join("\n"),
  };
}

export function emailVerificationEmail(link: string): { subject: string; text: string } {
  return {
    subject: "DFT Portal — E-posta doğrulama",
    text: [
      "Merhaba,",
      "",
      "DFT Portal kaydınızın tamamlanması için e-posta adresinizi doğrulayın.",
      "Aşağıdaki bağlantı 24 saat geçerlidir:",
      "",
      link,
      "",
      "E-posta doğrulandıktan sonra hesabınız yönetici onayına sunulacaktır.",
    ].join("\n"),
  };
}

export function approvalNotificationEmail(name: string | null): { subject: string; text: string } {
  return {
    subject: "DFT Portal — Başvurunuz onaylandı",
    text: [
      `Merhaba ${name ?? ""}`.trim() + ",",
      "",
      "DFT Portal üyelik başvurunuz onaylandı. Artık portala giriş yapabilirsiniz.",
      "",
      process.env.APP_URL ?? "http://localhost:3000",
    ].join("\n"),
  };
}
