import { z } from "zod";

const optional = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine(
    (v) =>
      v === undefined ||
      /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i.test(v),
    "Geçerli bir URL girin (http:// veya https://).",
  );

const dateTimeString = z
  .string()
  .min(1, "Tarih-saat zorunlu.")
  .transform((v) => new Date(v))
  .refine((v) => !Number.isNaN(v.getTime()), "Geçersiz tarih.");

const optionalDateTime = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? new Date(v) : undefined))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Geçersiz tarih.");

export const meetingSchema = z
  .object({
    title: z.string().trim().min(2, "Başlık çok kısa.").max(200),
    startAt: dateTimeString,
    endAt: optionalDateTime,
    location: optional(200),
    onlineUrl: optionalUrl,
    description: optional(2000),
    agenda: optional(5000),
    pinToBoard: z
      .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
      .optional()
      .transform((v) => v === "on" || v === "true"),
  })
  .refine(
    (v) => !v.endAt || v.endAt.getTime() >= v.startAt.getTime(),
    { path: ["endAt"], message: "Bitiş, başlangıçtan önce olamaz." },
  );

export type MeetingInput = z.infer<typeof meetingSchema>;
