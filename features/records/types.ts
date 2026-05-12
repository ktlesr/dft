/**
 * Central registry of record types used in URLs, tables and the
 * dashboard. Keep slugs aligned with the route folders under
 * `app/(portal)/kayit/...` and `app/(portal)/kayitlarim/...`.
 *
 * Faz 8: "Paydaş" added; legacy "bilgi-cogaltimi" and "egitim-sunum"
 * remain queryable (eski kayıtların detay sayfaları çalışmaya devam
 * eder) ama yeni kayıt grid'inde gösterilmezler.
 */

export const RECORD_TYPES = [
  "proje-fikri",
  "proje-basvurusu",
  "basarili-proje",
  "etkinlik",
  "dokuman-icerik",
  "paydas",
  // Legacy — only used when surfacing existing rows.
  "bilgi-cogaltimi",
  "egitim-sunum",
] as const;

export type RecordTypeSlug = (typeof RECORD_TYPES)[number];

export const RECORD_LABELS: Record<RecordTypeSlug, string> = {
  "proje-fikri": "Proje Fikri",
  "proje-basvurusu": "Proje Başvurusu",
  "basarili-proje": "Başarılı Proje",
  etkinlik: "Etkinlik",
  "dokuman-icerik": "Dijital İçerik",
  paydas: "Paydaş",
  "bilgi-cogaltimi": "Bilgi Çoğaltımı",
  "egitim-sunum": "Eğitim / Sunum",
};

/** Bugün yeni kayıt eklenebilen tipler — UI listeleri/sayım kartları için. */
export const ACTIVE_RECORD_TYPES = [
  "proje-fikri",
  "proje-basvurusu",
  "basarili-proje",
  "etkinlik",
  "dokuman-icerik",
  "paydas",
] as const satisfies readonly RecordTypeSlug[];
export type ActiveRecordTypeSlug = (typeof ACTIVE_RECORD_TYPES)[number];

export const RECORD_ORDER: RecordTypeSlug[] = [...RECORD_TYPES];

export function isRecordType(x: string): x is RecordTypeSlug {
  return (RECORD_TYPES as readonly string[]).includes(x);
}
