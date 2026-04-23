import { z } from "zod";

const required = (max: number) => z.string().trim().min(2, "Çok kısa.").max(max);
const optional = (max = 3000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const minuteSchema = z.object({
  meetingId: z.string().min(1, "İlgili toplantı zorunlu."),
  date: z
    .string()
    .min(1, "Tarih zorunlu.")
    .transform((v) => new Date(v))
    .refine((v) => !Number.isNaN(v.getTime()), "Geçersiz tarih."),
  attendees: required(5000),
  topics: required(10000),
  decisions: required(10000),
  summary: optional(3000),
});

export type MinuteInput = z.infer<typeof minuteSchema>;
