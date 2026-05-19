export const FIXED_KPI_CODES = [
  "KPI_PROJECT_IDEA_TOTAL",
  "KPI_PROJECT_APPLICATION_TOTAL",
  "KPI_SUCCESSFUL_PROJECT_TOTAL",
  "KPI_EVENT_ATTENDED_TOTAL",
  "KPI_EVENT_ORGANIZED_TOTAL",
  "KPI_CONTENT_TOTAL",
  "KPI_STAKEHOLDER_TOTAL",
] as const;

export type FixedKpiCode = (typeof FIXED_KPI_CODES)[number];

export const FIXED_KPI_LABELS: Record<FixedKpiCode, string> = {
  KPI_PROJECT_IDEA_TOTAL: "Proje Fikri Sayısı (Toplam)",
  KPI_PROJECT_APPLICATION_TOTAL: "Proje Başvurusu Sayısı (Toplam)",
  KPI_SUCCESSFUL_PROJECT_TOTAL: "Başarılı Proje Sayısı (Toplam)",
  KPI_EVENT_ATTENDED_TOTAL: "Katılım Sağlanan Etkinlik Sayısı (Toplam)",
  KPI_EVENT_ORGANIZED_TOTAL: "Düzenlenen Etkinlik Sayısı (Toplam)",
  KPI_CONTENT_TOTAL: "Dijital İçerik Sayısı (Toplam)",
  KPI_STAKEHOLDER_TOTAL: "Paydaş Sayısı (Toplam)",
};

export const KPI_EVENT_ATTENDED_ROLE = "KATILIMCI" as const;
export const KPI_EVENT_ORGANIZED_ROLE = "ORGANIZATOR" as const;
