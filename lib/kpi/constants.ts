export const FIXED_KPI_CODES = [
  "KPI_PROJECT_IDEA_TOTAL",
  "KPI_PROJECT_APPLICATION_DIRECT_TOTAL",
  "KPI_PROJECT_APPLICATION_GUIDANCE_TOTAL",
  "KPI_SUCCESSFUL_PROJECT_TOTAL",
  "KPI_EVENT_ATTENDED_TOTAL",
  "KPI_EVENT_ORGANIZED_TOTAL",
  "KPI_CONTENT_TOTAL",
  "KPI_STAKEHOLDER_TOTAL",
] as const;

export type FixedKpiCode = (typeof FIXED_KPI_CODES)[number];

export const FIXED_KPI_LABELS: Record<FixedKpiCode, string> = {
  KPI_PROJECT_IDEA_TOTAL: "Proje Fikri",
  KPI_PROJECT_APPLICATION_DIRECT_TOTAL: "Proje Başvurusu",
  KPI_PROJECT_APPLICATION_GUIDANCE_TOTAL: "Danışmanlık/Rehberlik Sağlanan Proje Başvurusu",
  KPI_SUCCESSFUL_PROJECT_TOTAL: "Başarılı Proje",
  KPI_EVENT_ATTENDED_TOTAL: "Katılım Sağlanan Etkinlik",
  KPI_EVENT_ORGANIZED_TOTAL: "Düzenlenen Etkinlik",
  KPI_CONTENT_TOTAL: "Dijital İçerik",
  KPI_STAKEHOLDER_TOTAL: "Paydaş Sayısı",
};

export const FIXED_KPI_DESCRIPTIONS: Record<FixedKpiCode, string> = {
  KPI_PROJECT_IDEA_TOTAL: "Grup üyeleri tarafından girilen toplam proje fikri sayısıdır.",
  KPI_PROJECT_APPLICATION_DIRECT_TOTAL: "DFT üyesi tarafından bireysel olarak veya diğer DFT üyeleriyle işbirliği içinde başvuru sahibi ya da ortak olarak gerçekleştirilen proje başvuru sayısıdır.",
  KPI_PROJECT_APPLICATION_GUIDANCE_TOTAL: "DFT üyesi tarafından danışmanlık/rehberlik yoluyla bir başka kişi ya da kuruluşa destek vermek suretiyle gerçekleştirilen proje başvuru sayısıdır.",
  KPI_SUCCESSFUL_PROJECT_TOTAL: "DFT üyesi tarafından bireysel olarak veya diğer DFT üyeleriyle işbirliği içinde başvuru sahibi ya da ortak olarak desteklenmeye hak kazanan proje sayısıdır.",
  KPI_EVENT_ATTENDED_TOTAL: "DFT üyesi tarafından “organizatör/moderatör/eğitmen/panelist/konuşmacı” sıfatıyla gerçekleştirilen etkinlik sayısıdır.",
  KPI_EVENT_ORGANIZED_TOTAL: "DFT üyesi tarafından ”katılımcı” sıfatıyla yer alınan etkinlik sayısıdır.",
  KPI_CONTENT_TOTAL: "DFT üyesi tarafından paylaşılan dijital içerik sayısıdır.",
  KPI_STAKEHOLDER_TOTAL: "DFT üyesi tarafından paylaşılan dış paydaş sayısıdır.",
};

export const KPI_EVENT_ATTENDED_ROLE = "KATILIMCI" as const;
export const KPI_EVENT_ORGANIZED_ROLE = "ORGANIZATOR" as const;
