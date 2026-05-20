import { z } from "zod";

export const NOTICE_SCOPES = ["GENERAL", "GROUP"] as const;
export const NOTICE_KINDS = ["MEETING", "EVENT", "NEWS", "OTHER"] as const;

const checkboxToBool = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.literal(undefined), z.null()])
  .optional()
  .transform((v) => v === "on" || v === "true");

const optionalDateTime = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? new Date(v) : undefined))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Geçersiz tarih.");

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v !== "" ? v : undefined))
  .refine(
    (v) =>
      v === undefined ||
      /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i.test(v),
    "Geçerli bir URL girin (http:// veya https://).",
  );

export const noticeCreateSchema = z
  .object({
    scope: z.enum(NOTICE_SCOPES),
    kind: z.enum(NOTICE_KINDS),
    groupId: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined)),
    title: z.string().trim().min(2, "Başlık en az 2 karakter.").max(200, "Başlık çok uzun."),
    body: z.string().trim().min(1, "İçerik zorunlu.").max(10_000, "İçerik çok uzun."),
    externalUrl: optionalUrl,
    eventStartAt: optionalDateTime,
    eventEndAt: optionalDateTime,
    pinned: checkboxToBool,
  })
  .superRefine((v, ctx) => {
    if (v.scope === "GROUP" && !v.groupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupId"],
        message: "Grup seçilmelidir.",
      });
    }

    if (v.eventStartAt && v.eventEndAt && v.eventEndAt.getTime() < v.eventStartAt.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventEndAt"],
        message: "Bitiş tarihi, başlangıçtan önce olamaz.",
      });
    }
  });

export type NoticeCreateInput = z.infer<typeof noticeCreateSchema>;
