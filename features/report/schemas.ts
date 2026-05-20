import { z } from "zod";

const required = (max: number) => z.string().trim().min(2, "Çok kısa.").max(max);
const optional = (max = 3000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const reportSchema = z
  .object({
    kind: z.enum(["YOL_HARITASI", "DORT_AYLIK_1", "DORT_AYLIK_2", "DORT_AYLIK_3", "KAPANIS"]),
    title: required(200),
    summary: optional(3000),
  });

export type ReportInput = z.infer<typeof reportSchema>;
