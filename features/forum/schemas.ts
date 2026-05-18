import { z } from "zod";

const checkboxToBool = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.literal(undefined), z.null()])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const discussionCreateSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter.").max(200, "Başlık çok uzun."),
  body: z.string().trim().min(1, "İçerik zorunlu.").max(20_000, "İçerik çok uzun."),
  /** Yalnızca admin sabitleyebilir; client form sabit yollasa bile action seviyesinde kısıtlanır. */
  pinned: checkboxToBool,
});
export type DiscussionCreateInput = z.infer<typeof discussionCreateSchema>;

export const replyCreateSchema = z.object({
  discussionId: z.string().min(1),
  body: z.string().trim().min(1, "Yanıt boş olamaz.").max(10_000, "Yanıt çok uzun."),
});
export type ReplyCreateInput = z.infer<typeof replyCreateSchema>;
