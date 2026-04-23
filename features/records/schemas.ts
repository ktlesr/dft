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

/* ────────── 1) Proje Başvurusu ────────── */

export const projectApplicationSchema = z.object({
  projectName: trimmed(2, 200),
  program: optionalString(150),
  callName: optionalString(200),
  applicationDate: optionalDate,
  budget: optionalDecimal,
  requestedSupport: optionalDecimal,
  status: z.enum([
    "PLANLANIYOR",
    "BASVURULDU",
    "DEGERLENDIRMEDE",
    "KABUL",
    "RED",
    "GERI_CEKILDI",
  ]),
  kind: z.enum(["BIREYSEL", "DFT_ILE_BIRLIKTE"]),
  partnerMemberIds: memberIdsArray,
  notes: longText(5000),
});
export type ProjectApplicationInput = z.infer<typeof projectApplicationSchema>;

/* ────────── 2) Başarılı Proje ────────── */

export const successfulProjectSchema = z.object({
  projectName: trimmed(2, 200),
  program: optionalString(150),
  callName: optionalString(200),
  applicationDate: optionalDate,
  resultDate: optionalDate,
  totalBudget: optionalDecimal,
  supportAmount: optionalDecimal,
  role: optionalString(120),
  kind: optionalString(120),
  resultDocument: optionalString(200),
  summary: longText(3000),
});
export type SuccessfulProjectInput = z.infer<typeof successfulProjectSchema>;

/* ────────── 3) Proje Fikri / Hazırlık ────────── */

export const projectIdeaSchema = z.object({
  title: trimmed(2, 200),
  potentialProgram: optionalString(150),
  callTopic: optionalString(200),
  stage: z.enum(["FIKIR", "ON_ARASTIRMA", "HAZIRLIK", "ORTAK_ARAYISI", "BASVURUYA_HAZIR"]),
  potentialPartners: optionalString(500),
  summary: longText(3000),
  nextStep: optionalString(500),
  targetDate: optionalDate,
  notes: longText(3000),
});
export type ProjectIdeaInput = z.infer<typeof projectIdeaSchema>;

/* ────────── 4) Etkinlik ────────── */

export const eventSchema = z.object({
  name: trimmed(2, 200),
  kind: optionalString(120),
  date: requiredDate,
  location: optionalString(200),
  role: optionalString(120),
  topic: optionalString(200),
  summary: longText(3000),
  notes: longText(2000),
});
export type EventInput = z.infer<typeof eventSchema>;

/* ────────── 5) Bilgi Çoğaltımı ────────── */

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

/* ────────── 6) Eğitim / Sunum ────────── */

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

/* ────────── 7) Doküman / İçerik ────────── */

export const contentSchema = z.object({
  title: trimmed(2, 200),
  kind: optionalString(120),
  date: requiredDate,
  summary: longText(3000),
  mainDocument: optionalString(200),
  tags: tagsArray,
  notes: longText(2000),
});
export type ContentInput = z.infer<typeof contentSchema>;
