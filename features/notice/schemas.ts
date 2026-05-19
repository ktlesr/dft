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
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Gecersiz tarih.");

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v !== "" ? v : undefined))
  .refine(
    (v) =>
      v === undefined ||
      /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i.test(v),
    "Gecerli bir URL girin (http:// veya https://).",
  );

export const noticeCreateSchema = z
  .object({
    scope: z.enum(NOTICE_SCOPES),
    kind: z.enum(NOTICE_KINDS),
    groupId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v !== "" ? v : undefined)),
    title: z.string().trim().min(2, "Baslik en az 2 karakter.").max(200, "Baslik cok uzun."),
    body: z.string().trim().min(1, "Icerik zorunlu.").max(10_000, "Icerik cok uzun."),
    externalUrl: optionalUrl,
    eventAt: optionalDateTime,
    pinned: checkboxToBool,
  })
  .superRefine((v, ctx) => {
    if (v.scope === "GROUP" && !v.groupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groupId"],
        message: "Grup secilmelidir.",
      });
    }
  });

export type NoticeCreateInput = z.infer<typeof noticeCreateSchema>;
