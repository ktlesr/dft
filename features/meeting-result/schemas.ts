import { z } from "zod";

const optional = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const dateTimeString = z
  .string()
  .min(1, "Başlangıç tarihi zorunlu.")
  .transform((v) => new Date(v))
  .refine((v) => !Number.isNaN(v.getTime()), "Geçersiz tarih.");

const endDateTimeString = z
  .string()
  .min(1, "Bitiş tarihi zorunlu.")
  .transform((v) => new Date(v))
  .refine((v) => !Number.isNaN(v.getTime()), "Geçersiz tarih.");

export const meetingResultSchema = z
  .object({
    title: z.string().trim().min(2, "Başlık çok kısa.").max(200),
    description: optional(3000),
    startAt: dateTimeString,
    endAt: endDateTimeString,
    scope: z.enum(["GENEL", "MRDK"]),
    mrdkTarget: z.enum(["ALL", "SPECIFIC"]).optional(),
    targetGroupIds: z.array(z.string()).default([]),
  })
  .refine(
    (v) => v.endAt.getTime() >= v.startAt.getTime(),
    { path: ["endAt"], message: "Bitiş, başlangıçtan önce olamaz." }
  )
  .refine(
    (v) => {
      if (v.scope === "MRDK" && !v.mrdkTarget) {
        return false;
      }
      return true;
    },
    { path: ["mrdkTarget"], message: "MRDK için hedef grup seçilmelidir." }
  )
  .refine(
    (v) => {
      if (v.scope === "MRDK" && v.mrdkTarget === "SPECIFIC" && v.targetGroupIds.length === 0) {
        return false;
      }
      return true;
    },
    { path: ["targetGroupIds"], message: "En az bir hedef grup seçilmelidir." }
  );

export type MeetingResultInput = z.infer<typeof meetingResultSchema>;
export type MeetingResultFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};
