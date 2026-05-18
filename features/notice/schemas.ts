import { z } from "zod";

export const NOTICE_SCOPES = ["GENERAL", "GROUP"] as const;

const checkboxToBool = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.literal(undefined), z.null()])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const noticeCreateSchema = z
  .object({
    scope: z.enum(NOTICE_SCOPES),
    groupId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v !== "" ? v : undefined)),
    title: z.string().trim().min(2, "Başlık en az 2 karakter.").max(200, "Başlık çok uzun."),
    body: z.string().trim().min(1, "İçerik zorunlu.").max(10_000, "İçerik çok uzun."),
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
  });
export type NoticeCreateInput = z.infer<typeof noticeCreateSchema>;
