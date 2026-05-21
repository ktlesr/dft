import { z } from "zod";

/* ────────── shared coercers ────────── */

const trimmed = (min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, "Bu alan zorunlu.")
    .max(max, "Çok uzun.");

const optionalString = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, "Çok uzun.")
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const longText = (max = 5000) =>
  z
    .string()
    .trim()
    .max(max, "Çok uzun.")
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? new Date(v) : undefined))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Geçersiz tarih.");

const requiredDate = z
  .string()
  .min(1, "Tarih zorunlu.")
  .transform((v) => new Date(v))
  .refine((v) => !Number.isNaN(v.getTime()), "Geçersiz tarih.");

const optionalDecimal = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? v.replace(",", ".") : undefined))
  .refine(
    (v) => v === undefined || /^-?\d+(\.\d+)?$/.test(v),
    "Sayısal bir değer girin (örn. 150000).",
  );

/** Para birimi — yeni form kabul ettiği değerler. Boş/eksik → TRY varsayılan. */
export const CURRENCY_CODES = ["TRY", "EUR", "USD"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/**
 * Para birimi sembolleri. **Server component'lardan da import edilebilsin
 * diye `"use client"` modülü olan `currency-input.tsx` yerine burada
 * tutuluyor** — RSC boundary'i nedeniyle client modülden import edilen
 * non-component değerler bazı build modlarında `undefined` görünebiliyor.
 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  TRY: "₺",
  EUR: "€",
  USD: "$",
};

const optionalCurrency = z
  .enum(CURRENCY_CODES)
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalInt = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? parseInt(v, 10) : undefined))
  .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0), "Geçersiz sayı.");

const tagsArray = z
  .string()
  .optional()
  .transform((v) => (v ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20));

const memberIdsArray = z
  .array(z.string().min(1))
  .optional()
  .transform((v) => v ?? []);

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((v) => (v && v !== "" ? v : undefined))
  .refine(
    (v) =>
      v === undefined ||
      /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i.test(v),
    "Geçerli bir URL girin (http:// veya https://).",
  );

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .transform((v) => (v && v !== "" ? v.toLowerCase() : undefined))
  .refine(
    (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "Geçerli bir e-posta girin.",
  );

/* ────────── Fon Türü (kademeli) ────────── */

// Üst kategoriler — yeni başvuru / başarı formlarında zorunlu.
export const FUND_CATEGORIES = ["ULUSAL", "AB", "DIGER_ULUSLARARASI"] as const;
export type FundCategory = (typeof FUND_CATEGORIES)[number];

const optionalFundCategory = z
  .enum(FUND_CATEGORIES)
  .optional()
  .or(z.literal("").transform(() => undefined));

// `memberFunction` — "DFT üyesinin fonksiyonu" yeni 3 seçenekli set.
export const MEMBER_FUNCTIONS = ["BIREYSEL", "DFT_ILE_BIRLIKTE", "DANISMANLIK"] as const;
export type MemberFunction = (typeof MEMBER_FUNCTIONS)[number];

const memberFunctionRequired = z.enum(MEMBER_FUNCTIONS);

// İlgili kurum/kuruluşun projedeki rolü.
export const APPLICANT_ROLES = ["BASVURAN", "ORTAK", "ISTIRAKCI"] as const;
export type ApplicantRole = (typeof APPLICANT_ROLES)[number];

const optionalApplicantRole = z
  .enum(APPLICANT_ROLES)
  .optional()
  .or(z.literal("").transform(() => undefined));

/* ════════════ 1) Proje Başvurusu (Faz 8) ════════════ */

export const projectApplicationSchema = z.object({
  projectName: trimmed(2, 200),
  fundCategory: optionalFundCategory,
  fundSubType: optionalString(150),
  grantProvider: optionalString(200),
  programName: optionalString(200),
  applicantOrg: optionalString(200),
  applicantRole: optionalApplicantRole,
  budget: optionalDecimal,
  requestedSupport: optionalDecimal,
  currency: optionalCurrency,
  applicationDate: optionalDate,
  memberFunction: memberFunctionRequired,
  partnerMemberIds: memberIdsArray,
  // Field label in UI is "Proje Özeti" but the DB column stays `notes`
  // to avoid a breaking schema rename.
  notes: longText(5000),
});
export type ProjectApplicationInput = z.infer<typeof projectApplicationSchema>;

/* ════════════ 2) Başarılı Proje (Faz 8) ════════════ */

export const successfulProjectSchema = z.object({
  projectName: trimmed(2, 200),
  fundCategory: optionalFundCategory,
  fundSubType: optionalString(150),
  grantProvider: optionalString(200),
  programName: optionalString(200),
  applicantOrg: optionalString(200),
  applicantRole: optionalApplicantRole,
  totalBudget: optionalDecimal,
  supportAmount: optionalDecimal,
  currency: optionalCurrency,
  applicationDate: optionalDate,
  acceptanceDate: optionalDate,
  memberFunction: memberFunctionRequired,
  summary: longText(5000),
});
export type SuccessfulProjectInput = z.infer<typeof successfulProjectSchema>;

/* ════════════ 3) Proje Fikri (Faz 8) ════════════ */

export const projectIdeaSchema = z.object({
  title: trimmed(2, 200),
  grantProvider: optionalString(200),
  potentialProgram: optionalString(150),
  budget: optionalDecimal,
  currency: optionalCurrency,
  summary: longText(5000),
});
export type ProjectIdeaInput = z.infer<typeof projectIdeaSchema>;

/* ════════════ 4) Etkinlik (Faz 8) ════════════ */

// Yeni etkinlik türleri.
export const EVENT_KINDS = [
  "AG_KURMA",          // Ağ Kurma / Eşleştirme
  "BILGILENDIRME",     // Bilgilendirme / Eğitim
  "CALISTAY",          // Çalıştay / Ortak Üretim
  "DIGER",             // Diğer (Konferans, Panel, vb.)
] as const;
export type EventKindCode = (typeof EVENT_KINDS)[number];

export const EVENT_FORMATS = ["FIZIKI", "ONLINE", "HIBRIT"] as const;
export type EventFormatCode = (typeof EVENT_FORMATS)[number];

export const EVENT_ROLES = [
  "ORGANIZATOR",
  "MODERATOR",
  "EGITMEN",
  "PANELIST",     // Panelist / Konuşmacı
  "KATILIMCI",
] as const;
export type EventRoleCode = (typeof EVENT_ROLES)[number];

export const eventSchema = z
  .object({
    name: trimmed(2, 200),
    organizer: optionalString(200),
    // `date` artık başlangıç tarih+saatini taşır (form datetime-local
    // gönderir). `requiredDate` zaten ISO ve date-only formatlarını
    // kabul ettiği için legacy yüklemeler bozulmaz.
    date: requiredDate,
    endAt: optionalDate,
    kind: z.enum(EVENT_KINDS),
    format: z.enum(EVENT_FORMATS),
    role: z.enum(EVENT_ROLES),
    externalUrl: optionalHttpsUrl,
    summary: longText(5000),
  })
  .superRefine((v, ctx) => {
    if (v.endAt && v.endAt < v.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "Bitiş tarihi başlangıçtan önce olamaz.",
      });
    }
  });
export type EventInput = z.infer<typeof eventSchema>;

/* ════════════ 5) Bilgi Çoğaltımı (legacy — Faz 6'da sadeleştirildi) ════════════ */

export const disseminationSchema = z.object({
  title: trimmed(2, 200),
  date: requiredDate,
  location: optionalString(200),
  kind: optionalString(120),
  audience: optionalString(200),
  participantCount: optionalInt,
  relatedTopic: optionalString(200),
  summary: longText(3000),
  notes: longText(2000),
});
export type DisseminationInput = z.infer<typeof disseminationSchema>;

/* ════════════ 6) Eğitim / Sunum (legacy) ════════════ */

export const trainingSchema = z.object({
  title: trimmed(2, 200),
  date: requiredDate,
  location: optionalString(200),
  audience: optionalString(200),
  participantCount: optionalInt,
  role: optionalString(120),
  summary: longText(3000),
  notes: longText(2000),
});
export type TrainingInput = z.infer<typeof trainingSchema>;

/* ════════════ 7) Dijital İçerik (Faz 8) ════════════ */

// Yeni Tür listesi: Bilgi Notu / Kitap / Makale / Rapor / Sunum / Video.
export const CONTENT_KINDS = [
  "BILGI_NOTU",
  "KITAP",
  "MAKALE",
  "RAPOR",
  "SUNUM",
  "VIDEO",
] as const;
export type ContentKindCode = (typeof CONTENT_KINDS)[number];

export const contentSchema = z.object({
  title: trimmed(2, 200),
  kind: z.enum(CONTENT_KINDS),
  externalUrl: optionalHttpsUrl,
  tags: tagsArray,
  summary: longText(5000),
});
export type ContentInput = z.infer<typeof contentSchema>;

/* ════════════ 8) Paydaş (Faz 8 — yeni) ════════════ */

export const STAKEHOLDER_KINDS = ["YERLI", "YABANCI"] as const;
export type StakeholderKindCode = (typeof STAKEHOLDER_KINDS)[number];

export const stakeholderSchema = z.object({
  fullName: trimmed(2, 200),
  positionTitle: optionalString(200),
  kind: z.enum(STAKEHOLDER_KINDS),
  organization: optionalString(200),
  linkedinUrl: optionalHttpsUrl,
  email: optionalEmail,
  city: optionalString(120),
  country: optionalString(120),
  tags: tagsArray,
  description: longText(5000),
});
export type StakeholderInput = z.infer<typeof stakeholderSchema>;
