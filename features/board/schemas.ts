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

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? new Date(v) : undefined))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Geçersiz tarih.");

export const boardPostSchema = z.object({
  scope: z.enum(boardScopes),
  kind: z.enum(boardKinds),
  title: z.string().trim().min(2, "Başlık çok kısa.").max(200, "Başlık çok uzun."),
  body: z.string().trim().min(2, "İçerik çok kısa.").max(10_000, "İçerik çok uzun."),
  // Faz 6: genel panoda editör "TR33 Bölgesi Açısından Değerlendirme"
  // metnini ayrıca doldurabilir. Boş bırakılabilir.
  assessment: z
    .string()
    .trim()
    .max(10_000, "Değerlendirme çok uzun.")
    .optional()
    .transform((v) => (v && v !== "" ? v : undefined)),
  // Faz 6: paylaşım tarihi kullanıcı tarafından set edilebilir. Boş
  // bırakılırsa server tarafında `new Date()` kullanılır.
  publishedAt: optionalDate,
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
