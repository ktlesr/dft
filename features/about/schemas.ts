import { z } from "zod";

/**
 * Persisted shape under `AppSetting[key="dft-about"]`. Stored as JSON so
 * the schema can evolve without a Prisma migration.
 */
export const aboutFileSchema = z.object({
  storageKey: z.string().min(1).max(512),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().nonnegative(),
  uploadedAt: z.string().min(10).max(40),
});
export type AboutFile = z.infer<typeof aboutFileSchema>;

export const aboutContentSchema = z.object({
  /** Hero kart başlığı (eski "DFT Kapalı Portalı" yerine). */
  title: z.string().trim().min(2).max(200),
  /** Hero kart altı kısa tanıtım metni — 500 karakter civarı yeterli. */
  summary: z.string().trim().min(1).max(2000),
  /** Modal'da görünen detaylı metin. Düz metin; satır sonları korunur. */
  body: z.string().trim().min(1).max(20000),
  attachments: z.array(aboutFileSchema).max(20),
  updatedAt: z.string().min(10).max(40),
});
export type AboutContent = z.infer<typeof aboutContentSchema>;

/** Admin formundan gelen text alanları için ayrı şema (attachments form dışı). */
export const aboutEditSchema = z.object({
  title: z.string().trim().min(2, "Başlık en az 2 karakter.").max(200, "Başlık çok uzun."),
  summary: z.string().trim().min(1, "Özet zorunlu.").max(2000, "Özet çok uzun."),
  body: z.string().trim().min(1, "İçerik zorunlu.").max(20000, "İçerik çok uzun."),
});
export type AboutEditInput = z.infer<typeof aboutEditSchema>;

export const APP_SETTING_KEY = "dft-about";

export const DEFAULT_ABOUT: AboutContent = {
  title: "DFT Projesi Nedir?",
  summary:
    "DFT; ulusal ve uluslararası fon programları kapsamında proje geliştiren, etkinlik düzenleyen ve bilgi üreten uzmanların koordinasyon halinde çalıştığı bir topluluktur.",
  body:
    "DFT topluluğu; üyelerinin proje fikirlerini, başvurularını, etkinlik kayıtlarını, dijital içeriklerini ve paydaş ağını tek bir güvenli ortakta yönetmesini hedefler.\n\nBu metni güncellemek için Yönetim Paneli > DFT Hakkında bölümünü kullanın.",
  attachments: [],
  updatedAt: new Date(0).toISOString(),
};
