/**
 * Central registry of the 7 record types used in URLs, tables and the
 * dashboard. Keep slugs aligned with the route folders under
 * `app/(portal)/kayit/...` and `app/(portal)/kayitlarim/...`.
 */

export const RECORD_TYPES = [
  "proje-basvurusu",
  "basarili-proje",
  "proje-fikri",
  "etkinlik",
  "bilgi-cogaltimi",
  "egitim-sunum",
  "dokuman-icerik",
] as const;

export type RecordTypeSlug = (typeof RECORD_TYPES)[number];

export const RECORD_LABELS: Record<RecordTypeSlug, string> = {
  "proje-basvurusu": "Proje Başvurusu",
  "basarili-proje": "Başarılı Proje",
  "proje-fikri": "Proje Fikri",
  etkinlik: "Etkinlik",
  "bilgi-cogaltimi": "Bilgi Çoğaltımı",
  "egitim-sunum": "Eğitim / Sunum",
  "dokuman-icerik": "Doküman / İçerik",
};

export const RECORD_ORDER: RecordTypeSlug[] = [...RECORD_TYPES];

export function isRecordType(x: string): x is RecordTypeSlug {
  return (RECORD_TYPES as readonly string[]).includes(x);
}
