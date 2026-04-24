import type { Role } from "@prisma/client";

export const APP_NAME = "DFT Portal";
export const APP_FULL_NAME = "DFT Kapalı Portalı";

/**
 * Faz 7: Groups are now fully dynamic (admin-managed). `GROUP_LABELS`
 * persists only as a fallback dictionary for the 5 codes that were
 * hard-coded before — handy when a legacy row surfaces and its `Group`
 * relation isn't in scope. New callers should prefer `group.name` /
 * `group.description` fetched from the DB.
 */
export const GROUP_LABELS: Record<string, { name: string; description: string }> = {
  UAK: {
    name: "UAK",
    description: "Uluslararası ve Akademik Koordinasyon",
  },
  E2SC: {
    name: "E2SC",
    description: "Education, Employment, Social & Community",
  },
  DFSF: {
    name: "DFSF",
    description: "Digital, Finance, Services & Foresight",
  },
  PGD: {
    name: "PGD",
    description: "Proje Geliştirme ve Değerlendirme",
  },
  PA: {
    name: "PA",
    description: "Politika ve Araştırma",
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  USER: "Üye",
  MODERATOR: "Moderatör",
  RAPPORTEUR: "Raportör",
  ADMIN: "Yönetici",
};

export const USER_STATUS_LABELS = {
  PENDING_APPROVAL: "Onay Bekliyor",
  ACTIVE: "Aktif",
  SUSPENDED: "Askıya Alındı",
  REJECTED: "Reddedildi",
} as const;

/**
 * Pano türü etiketleri. Enum değerleri schema'da aynı kalır — sadece
 * görünen etiketler Faz 6 sadeleştirmesiyle güncellendi. `SUGGESTION` ve
 * `DISCUSSION` yeni paylaşımlarda seçilemez (aşağıdaki scope listelerine
 * bakın) ama eski kayıtlar için legacy etiket olarak tutuluyor.
 */
export const BOARD_KIND_LABELS = {
  NEWS: "Haber/Etkinlik",
  ANNOUNCEMENT: "Çağrı/Hibe Duyurusu",
  RESOURCE: "Doküman Paylaşımı",
  IDEA: "Fikir",
  SUGGESTION: "Öneri",
  DISCUSSION: "Tartışma",
} as const;

/**
 * Her pano kapsamında yeni paylaşım formunda ve filtrede gösterilecek
 * türler. Yeni kayıtlar için izinli olan enum değerleri bu listededir.
 * Detay/listelemede tüm enum değerleri (legacy dahil) görüntülenmeye
 * devam eder.
 */
export const BOARD_KIND_BY_SCOPE = {
  GENERAL: ["NEWS", "ANNOUNCEMENT", "RESOURCE"] as const,
  GROUP: ["NEWS", "ANNOUNCEMENT", "IDEA"] as const,
} as const;

export const REPORT_KIND_LABELS = {
  YOL_HARITASI: "Yol Haritası",
  IKI_AYLIK: "İki Aylık",
  KAPANIS: "Kapanış",
  ANLIK_NOT: "Diğer",
} as const;

export const DOCUMENT_CATEGORY_LABELS = {
  ORTAK: "Ortak Belgeler",
  GRUP: "Grup Belgeleri",
  TUTANAK_EK: "Tutanak Ekleri",
  RAPOR_EK: "Rapor Ekleri",
  UYE_YUKLEMESI: "Üye Yüklemeleri",
} as const;

export const PROJECT_APPLICATION_KIND_LABELS = {
  BIREYSEL: "Bireysel",
  DFT_ILE_BIRLIKTE: "DFT ile Birlikte",
} as const;

export const PROJECT_APPLICATION_STATUS_LABELS = {
  PLANLANIYOR: "Planlanıyor",
  BASVURULDU: "Başvuruldu",
  DEGERLENDIRMEDE: "Değerlendirmede",
  KABUL: "Kabul",
  RED: "Red",
  GERI_CEKILDI: "Geri Çekildi",
} as const;

export const PROJECT_IDEA_STAGE_LABELS = {
  FIKIR: "Fikir",
  ON_ARASTIRMA: "Ön Araştırma",
  HAZIRLIK: "Hazırlık",
  ORTAK_ARAYISI: "Ortak Arayışı",
  BASVURUYA_HAZIR: "Başvuruya Hazır",
} as const;

export const ALLOWED_UPLOAD_MIME = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/zip",
]);

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 15 * 1024 * 1024);

/** Maximum files per upload form submission. */
export const MAX_ATTACHMENTS_PER_REQUEST = 10;

/** Bulk import (Excel) — separate cap from generic upload path. */
export const MAX_BULK_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_BULK_IMPORT_ROWS = 1000;
