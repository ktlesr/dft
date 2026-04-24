import Link from "next/link";
import {
  Briefcase,
  Trophy,
  Lightbulb,
  CalendarCheck,
  FileStack,
  type LucideIcon,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Yeni Kayıt Ekle" };

type RecordTile = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

type RecordGroup = {
  title: string;
  tiles: RecordTile[];
};

/**
 * Faz 6 sadeleştirmesi: 7 kayıt tipinden 5'i görünür kalır, iki kategori
 * altında gruplanır. `/kayit/bilgi-cogaltimi` ve `/kayit/egitim-sunum`
 * rotaları mevcut ve çalışmaya devam eder (legacy kayıtların detay
 * sayfaları kırılmasın diye) — sadece bu ızgaradan erişilmez.
 */
const GROUPS: RecordGroup[] = [
  {
    title: "Proje Kaydı",
    tiles: [
      {
        href: "/kayit/proje-fikri",
        title: "Fikir",
        description: "Henüz başvuru aşamasında olmayan çalışmalar ve ortak arayışı.",
        icon: Lightbulb,
      },
      {
        href: "/kayit/proje-basvurusu",
        title: "Proje Başvurusu",
        description: "Program/fon, çağrı, bütçe, başvuru tarihi ve ortak bilgileri.",
        icon: Briefcase,
      },
      {
        href: "/kayit/basarili-proje",
        title: "Başarılı Proje",
        description: "Kabul edilmiş / tamamlanmış projeleriniz.",
        icon: Trophy,
      },
    ],
  },
  {
    title: "Bilgi Çoğaltımı Kaydı",
    tiles: [
      {
        href: "/kayit/etkinlik",
        title: "Etkinlik",
        description: "Katıldığınız veya düzenlediğiniz etkinlikler.",
        icon: CalendarCheck,
      },
      {
        href: "/kayit/dokuman-icerik",
        title: "Doküman / İçerik",
        description: "Ürettiğiniz içerik, rapor ve dokümanlar.",
        icon: FileStack,
      },
    ],
  },
];

export default function NewRecordPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Yeni Kayıt Ekle"
        description="Eklemek istediğiniz kayıt türünü seçin. Her tip için özel form ekranı açılır."
        breadcrumbs={[{ label: "Yeni Kayıt Ekle" }]}
      />

      <div className="space-y-6">
        {GROUPS.map((group) => (
          <section
            key={group.title}
            className="relative rounded-xl border bg-card/40 px-5 pb-5 pt-7"
          >
            <h2 className="absolute left-4 top-0 -translate-y-1/2 bg-background px-2 text-sm font-semibold tracking-tight">
              {group.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.tiles.map((t) => {
                const Icon = t.icon;
                return (
                  <Link key={t.href} href={t.href} className="group">
                    <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                      <CardContent className="flex h-full flex-col gap-3 p-5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold group-hover:text-primary">{t.title}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
