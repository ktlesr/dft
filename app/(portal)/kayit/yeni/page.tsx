import Link from "next/link";
import {
  Briefcase,
  Trophy,
  Lightbulb,
  CalendarCheck,
  FileStack,
  Users,
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
 * Faz 8: 6 aktif kayıt tipi 3 mantıksal grupta. Legacy
 * `/kayit/bilgi-cogaltimi` ve `/kayit/egitim-sunum` rotaları mevcut ve
 * çalışmaya devam eder (eski kayıtların detay sayfaları kırılmasın
 * diye) — bu grid'den erişilmez.
 */
const GROUPS: RecordGroup[] = [
  {
    title: "Proje Kaydı",
    tiles: [
      {
        href: "/kayit/proje-fikri",
        title: "Proje Fikri",
        description: "Herhangi bir çağrıya sunulmamış proje fikirleri.",
        icon: Lightbulb,
      },
      {
        href: "/kayit/proje-basvurusu",
        title: "Proje Başvurusu",
        description: "Başvurusu yapılmış ancak henüz sonuçlanmamış projeler.",
        icon: Briefcase,
      },
      {
        href: "/kayit/basarili-proje",
        title: "Başarılı Proje",
        description: "Destek almaya hak kazanmış projeler.",
        icon: Trophy,
      },
    ],
  },
  {
    title: "Bilgi Çoğaltımı",
    tiles: [
      {
        href: "/kayit/etkinlik",
        title: "Etkinlik",
        description: "Düzenlediğiniz veya katıldığınız toplantı, çalıştay, ağ kurma etkinlikleri.",
        icon: CalendarCheck,
      },
      {
        href: "/kayit/dokuman-icerik",
        title: "Dijital İçerik",
        description: "Rapor, makale, strateji belgesi, eğitim videosu vb.",
        icon: FileStack,
      },
      {
        href: "/kayit/paydas",
        title: "Paydaş",
        description: "Ulusal / uluslararası paydaş kayıtları.",
        icon: Users,
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
