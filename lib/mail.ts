/**
 * Mail sender abstraction.
 *
 * Provider is selected at runtime based on env:
 *
 *   - RESEND_API_KEY set → Resend HTTPS API (preferred)
 *   - MAIL_DRIVER="smtp" + SMTP_* → future SMTP driver (stub in place)
 *   - otherwise            → console stream (dev / CI)
 *
 * Call sites stay stable: everything goes through `sendMail({ to, subject, text })`.
 */

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const FROM = process.env.MAIL_FROM ?? "DFT Portal <no-reply@dft.local>";

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Send a mail. Returns when the provider has accepted the message;
 * does not wait for actual delivery. Swallows its own errors and logs
 * them — mail failures must never take down the parent request.
 */
export async function sendMail({ to, subject, text, html }: MailInput): Promise<void> {
  if (!isEmail(to)) {
    console.error(`[mail] refusing invalid recipient: ${to}`);
    return;
  }

  const driver = selectDriver();
  try {
    await driver({ to, subject, text, html });
  } catch (err) {
    // Observability path: errors here should surface in logs but not
    // propagate to the caller (most auth flows intentionally pretend
    // mail always succeeds to avoid account enumeration).
    console.error("[mail] send failed:", err);
  }
}

type Driver = (input: MailInput) => Promise<void>;

let cachedDriver: Driver | null = null;

function selectDriver(): Driver {
  if (cachedDriver) return cachedDriver;

  if (process.env.RESEND_API_KEY) {
    cachedDriver = resendDriver;
  } else {
    cachedDriver = consoleDriver;
  }
  return cachedDriver;
}

/* ── Resend driver ─────────────────────────────────────────────── */

async function resendDriver({ to, subject, text, html }: MailInput): Promise<void> {
  // Lightweight fetch to the Resend REST API avoids pulling the `resend`
  // package into the client bundle and keeps the runtime small.
  const body = {
    from: FROM,
    to: [to],
    subject,
    text,
    ...(html ? { html } : {}),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "<no body>");
    throw new Error(`resend ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/* ── Console driver (dev / CI fallback) ────────────────────────── */

async function consoleDriver({ to, subject, text }: MailInput): Promise<void> {
  const sep = "━".repeat(72);
  const body = text ?? "";
  // eslint-disable-next-line no-console
  console.log(
    [
      "",
      sep,
      `📧 MAIL  →  ${to}`,
      `📌  ${subject}`,
      `🧪  driver=console (no RESEND_API_KEY set)`,
      sep,
      body,
      sep,
      "",
    ].join("\n"),
  );
}

/* ── Templates ─────────────────────────────────────────────────── */

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
