import { z } from "zod";

export const boardKinds = [
  "NEWS",
  "ANNOUNCEMENT",
  "SUGGESTION",
  "IDEA",
  "RESOURCE",
  "DISCUSSION",
] as const;

export const boardScopes = ["GENERAL", "GROUP"] as const;

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

export const boardPostSchema = z.object({
  scope: z.enum(boardScopes),
  kind: z.enum(boardKinds),
  title: z.string().trim().min(2, "Başlık çok kısa.").max(200, "Başlık çok uzun."),
  body: z.string().trim().min(2, "İçerik çok kısa.").max(10_000, "İçerik çok uzun."),
  externalUrl: optionalUrl,
  tags: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12)),
  pinned: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export type BoardPostInput = z.infer<typeof boardPostSchema>;
