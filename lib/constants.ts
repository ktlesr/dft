import type { GroupCode, Role } from "@prisma/client";

export const APP_NAME = "DFT Portal";
export const APP_FULL_NAME = "DFT Kapalı Portalı";

export const GROUP_LABELS: Record<GroupCode, { name: string; description: string }> = {
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

export const BOARD_KIND_LABELS = {
  NEWS: "Haber",
  ANNOUNCEMENT: "Duyuru",
  SUGGESTION: "Öneri",
  IDEA: "Fikir",
  RESOURCE: "Kaynak",
  DISCUSSION: "Tartışma",
} as const;

export const REPORT_KIND_LABELS = {
  YOL_HARITASI: "Yol Haritası",
  IKI_AYLIK: "İki Aylık",
  KAPANIS: "Kapanış",
  ANLIK_NOT: "Anlık Not",
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
