import { z } from "zod";

const required = (max: number) => z.string().trim().min(2, "Çok kısa.").max(max);
const optional = (max = 3000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? new Date(v) : undefined))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Geçersiz tarih.");

export const reportSchema = z
  .object({
    kind: z.enum(["YOL_HARITASI", "DORT_AYLIK_1", "DORT_AYLIK_2", "DORT_AYLIK_3", "KAPANIS"]),
    title: required(200),
    periodStart: optionalDate,
    periodEnd: optionalDate,
    summary: optional(3000),
  })
  .refine(
    (v) => !v.periodStart || !v.periodEnd || v.periodEnd.getTime() >= v.periodStart.getTime(),
    { path: ["periodEnd"], message: "Dönem bitişi başlangıcından önce olamaz." },
  );

export type ReportInput = z.infer<typeof reportSchema>;
