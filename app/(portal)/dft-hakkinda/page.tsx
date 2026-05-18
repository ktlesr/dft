import { Building2, Globe2, Mail, MessageSquare, Sparkles, Target, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { BrandVertical } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/current-user";
import { getAboutContent } from "@/features/about/queries";
import { AboutModal } from "@/features/about/about-modal";

export const metadata = { title: "DFT Hakkında" };
export const dynamic = "force-dynamic";

export default async function DftAboutPage() {
  // Yetkili kullanıcı gereksinimi — portal layout zaten sağlıyor; çağrı
  // burada da garantiye alınıyor (defence-in-depth).
  await requireActiveUser();

  const [groups, memberCount, postCount, meetingCount, about] = await Promise.all([
    prisma.group.findMany({ orderBy: { code: "asc" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.boardPost.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.meeting.count({ where: { deletedAt: null } }),
    getAboutContent(),
  ]);

  const stats: Array<{ label: string; value: number; icon: typeof Users }> = [
    { label: "Aktif Üye", value: memberCount, icon: Users },
    { label: "Çalışma Grubu", value: groups.length, icon: Building2 },
    { label: "Toplantı", value: meetingCount, icon: Sparkles },
    { label: "Paylaşım", value: postCount, icon: MessageSquare },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="DFT Hakkında"
        description="DFT topluluğu, çalışma grupları ve kurumsal kimliği hakkında genel bilgi."
        breadcrumbs={[{ label: "DFT Hakkında" }]}
      />

      {/* Hero — marka kimliği + dinamik tanıtım + Devamı modali */}
      <Card className="overflow-hidden">
        <CardContent className="bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:gap-10">
            <BrandVertical className="h-32 shrink-0 md:h-36" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold tracking-tight">{about.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {about.summary}
              </p>
              <div className="mt-5">
                <AboutModal
                  title={about.title}
                  summary={about.summary}
                  body={about.body}
                  attachments={about.attachments}
                  updatedAt={about.updatedAt}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kurumsal istatistikler */}
      <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Misyon / Vizyon */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Misyon
            </CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            Üyelerin proje, faaliyet ve çalışma grubu süreçlerini güvenli, sade
            ve sürdürülebilir bir kapalı portal aracılığıyla yönetmesini
            sağlamak; bireysel bilgiyi ortak kurumsal hafızaya dönüştürmek.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Vizyon
            </CardTitle>
            <Globe2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-foreground">
            Ulusal ve uluslararası fon programları, projeler, etkinlikler ve
            paydaş ağı arasında köprü kuran; bilgiyi ve iş birliğini tek bir
            kurumsal omurgada birleştiren referans bir koordinasyon merkezi
            olmak.
          </CardContent>
        </Card>
      </section>

      {/* Çalışma grupları — DB'den dinamik */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Çalışma Grupları
        </h2>
        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Henüz tanımlı çalışma grubu yok.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="font-medium">
                      {g.code}
                    </Badge>
                    <h3 className="truncate text-sm font-semibold">{g.name}</h3>
                  </div>
                  {g.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {g.description}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* İletişim */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              İletişim
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href="mailto:iletisim@dft.local" className="hover:text-primary">
                iletisim@dft.local
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              Portal erişimi, hesap yönetimi ve içerik onayları için yönetim
              ekibine yukarıdaki adresten ulaşabilirsiniz.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
