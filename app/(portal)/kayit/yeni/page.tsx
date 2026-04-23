import Link from "next/link";
import {
  Briefcase,
  Trophy,
  Lightbulb,
  CalendarCheck,
  Megaphone,
  GraduationCap,
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

const TILES: RecordTile[] = [
  {
    href: "/kayit/proje-basvurusu",
    title: "Yeni Proje Başvurusu",
    description: "Program/fon, çağrı, bütçe, başvuru tarihi ve ortak bilgileri.",
    icon: Briefcase,
  },
  {
    href: "/kayit/basarili-proje",
    title: "Başarılı Proje Kaydı",
    description: "Kabul edilmiş / tamamlanmış projeleriniz.",
    icon: Trophy,
  },
  {
    href: "/kayit/proje-fikri",
    title: "Proje Fikri / Hazırlık",
    description: "Henüz başvuru aşamasında olmayan çalışmalar ve ortak arayışı.",
    icon: Lightbulb,
  },
  {
    href: "/kayit/etkinlik",
    title: "Etkinlik Kaydı",
    description: "Katıldığınız veya düzenlediğiniz etkinlikler.",
    icon: CalendarCheck,
  },
  {
    href: "/kayit/bilgi-cogaltimi",
    title: "Bilgi Çoğaltımı Kaydı",
    description: "Bilgiyi yaydığınız sunum, seminer, çalıştay ve yayınlar.",
    icon: Megaphone,
  },
  {
    href: "/kayit/egitim-sunum",
    title: "Eğitim / Sunum Kaydı",
    description: "Verdiğiniz eğitim, sunum ve akademik paylaşımlar.",
    icon: GraduationCap,
  },
  {
    href: "/kayit/dokuman-icerik",
    title: "Doküman / İçerik Kaydı",
    description: "Ürettiğiniz içerik, rapor ve dokümanlar.",
    icon: FileStack,
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => {
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
    </div>
  );
}
