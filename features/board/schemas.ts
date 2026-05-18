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
  // Faz 6: genel panoda editör "Değerlendirme/Yorum"
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
  // HTML checkbox işaretli DEĞİLKEN FormData hiç bir değer yollamaz →
  // `fd.get("pinned")` `null` döner. Zod union'a `null` literal eklenir.
  pinned: z
    .union([
      z.literal("on"),
      z.literal("true"),
      z.literal("false"),
      z.literal(""),
      z.null(),
    ])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export type BoardPostInput = z.infer<typeof boardPostSchema>;

// Faz 10: admin'in geçmiş paylaşımları düzenleyebilmesi için kullanılan
// alt-şema. `scope` post üzerinden okunur; `pinned` durumu ayrı bir aksiyonla
// (`togglePin`) yönetildiği için burada yer almaz.
export const boardPostEditSchema = boardPostSchema.omit({ scope: true, pinned: true });

export type BoardPostEditInput = z.infer<typeof boardPostEditSchema>;
