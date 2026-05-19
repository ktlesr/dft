import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  FileStack,
  Lightbulb,
  Megaphone,
  Pin,
  PlusCircle,
  Presentation,
  Trophy,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { groupBadgeClass } from "@/lib/group-badge";
import { prisma } from "@/lib/prisma";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { formatDateTime, truncate } from "@/lib/utils";
import { RecentFeedTabs } from "@/features/records/recent-feed-tabs";
import { recentPublicRecords } from "@/features/records/recent-public";
import { ACTIVE_RECORD_TYPES, type ActiveRecordTypeSlug } from "@/features/records/types";
import { listNotices } from "@/features/notice/queries";
import { isAdmin } from "@/lib/rbac";

export const metadata = { title: "Ana Panel" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireActiveUser();

  const activeOwn = { ownerId: user.id, deletedAt: null };
  const activeAll = { deletedAt: null };
  const admin = isAdmin(user);

  const boardInclude = {
    author: { select: { name: true, email: true } },
    group: { select: { code: true } },
  } as const;

  const [
    cntIdeasOwn,
    cntIdeasAll,
    cntProjectAppsOwn,
    cntProjectAppsAll,
    cntSuccessOwn,
    cntSuccessAll,
    cntEventsOwn,
    cntEventsAll,
    cntContentOwn,
    cntContentAll,
    cntStakeholdersOwn,
    cntStakeholdersAll,
    // Sol büyük kart: Çağrı / Hibe / Etkinlik (genel kapsam — duyuru + kaynak)
    callPosts,
    // Orta kart: Genel Duyurular (genel kapsam — haber/etkinlik)
    generalNotices,
    // Sağ kart: Çalışma Grubu duyuruları
    groupNotices,
    // Sekmeli son paylaşımlar
    ...recentByType
  ] = await Promise.all([
    prisma.projectIdeaRecord.count({ where: activeOwn }),
    prisma.projectIdeaRecord.count({ where: activeAll }),
    prisma.projectApplicationRecord.count({ where: activeOwn }),
    prisma.projectApplicationRecord.count({ where: activeAll }),
    prisma.successfulProjectRecord.count({ where: activeOwn }),
    prisma.successfulProjectRecord.count({ where: activeAll }),
    prisma.eventRecord.count({ where: activeOwn }),
    prisma.eventRecord.count({ where: activeAll }),
    prisma.contentRecord.count({ where: activeOwn }),
    prisma.contentRecord.count({ where: activeAll }),
    prisma.stakeholderRecord.count({ where: activeOwn }),
    prisma.stakeholderRecord.count({ where: activeAll }),
    // Yalnızca ADMIN yetkisine sahip kullanıcıların paylaşımlarını göster.
    // Schema seviyesinde "yalnızca admin yazabilir" kuralı yok (Faz 6 board
    // policy'si moderatörü de admin olmayan grup paylaşımı için bırakıyor),
    // dolayısıyla bu kart sırf yazar bazlı UI filtresi ile sınırlandırılır.
    prisma.boardPost.findMany({
      where: {
        scope: "GENERAL",
        status: "PUBLISHED",
        deletedAt: null,
        kind: { in: ["ANNOUNCEMENT", "RESOURCE"] },
        author: { roles: { some: { role: "ADMIN" } } },
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 5,
      include: boardInclude,
    }),
    // Faz 9: Genel Bildirimler — yeni Notice modelinden, scope=GENERAL.
    listNotices({ scope: "GENERAL", take: 5 }),
    // Faz 9: Çalışma Grubu Bildirimleri — admin tüm grupları görür,
    // diğer üyeler yalnızca kendi grubunu.
    admin
      ? listNotices({ scope: "GROUP", allGroups: true, take: 5 })
      : user.groupId
        ? listNotices({ scope: "GROUP", groupId: user.groupId, take: 5 })
        : Promise.resolve([]),
    ...ACTIVE_RECORD_TYPES.map((t) => recentPublicRecords(t, 5)),
  ]);

  const feeds = Object.fromEntries(
    ACTIVE_RECORD_TYPES.map((t, i) => [t, recentByType[i] ?? []]),
  ) as Record<ActiveRecordTypeSlug, Awaited<ReturnType<typeof recentPublicRecords>>>;

  const stats = [
    {
      label: "Proje Fikri Kayıtlarım",
      value: cntIdeasOwn,
      total: cntIdeasAll,
      icon: Lightbulb,
      href: "/kayitlarim?tur=proje-fikri",
    },
    {
      label: "Proje Başvurusu Kayıtlarım",
      value: cntProjectAppsOwn,
      total: cntProjectAppsAll,
      icon: Briefcase,
      href: "/kayitlarim?tur=proje-basvurusu",
    },
    {
      label: "Başarılı Proje Kayıtlarım",
      value: cntSuccessOwn,
      total: cntSuccessAll,
      icon: Trophy,
      href: "/kayitlarim?tur=basarili-proje",
    },
    {
      label: "Etkinlik Kayıtlarım",
      value: cntEventsOwn,
      total: cntEventsAll,
      icon: Presentation,
      href: "/kayitlarim?tur=etkinlik",
    },
    {
      label: "Dijital İçerik Kayıtlarım",
      value: cntContentOwn,
      total: cntContentAll,
      icon: FileStack,
      href: "/kayitlarim?tur=dokuman-icerik",
    },
    {
      label: "Paydaş Kayıtlarım",
      value: cntStakeholdersOwn,
      total: cntStakeholdersAll,
      icon: Users,
      href: "/kayitlarim?tur=paydas",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`Hoş geldiniz${user.name ? `, ${user.name.split(" ")[0]}` : ""}`}
        description="Portalın ana kontrol merkezi — kayıtlarınızı, grup gelişmelerinizi ve son paylaşımları buradan takip edin."
        actions={
          <Button asChild variant="brand">
            <Link href="/kayit/yeni">
              <PlusCircle className="h-4 w-4" />
              Yeni Kayıt Ekle
            </Link>
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-tight">{s.value}</span>
                    <span className="text-sm text-muted-foreground">
                      / {s.total}
                      <span className="ml-1 text-xs">toplam</span>
                    </span>
                  </div>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <Link
                href={s.href}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Detay
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Çağrı/Hibe Duyurusu — admin yayını, herkese açık */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Çağrı/Hibe Duyurusu
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/panolar/genel?kategori=cagri-hibe-etkinlik">
                Tümü
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {callPosts.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Henüz duyuru yok"
                description="Yönetici çağrı veya doküman paylaştığında burada görünecek."
                className="border-0 py-6"
              />
            ) : (
              <ul className="divide-y">
                {callPosts.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      {p.pinned ? <Pin className="h-3 w-3 text-amber-600" aria-label="Sabit" /> : null}
                      <Link
                        href="/panolar/genel"
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {p.title}
                      </Link>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {BOARD_KIND_LABELS[p.kind]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {truncate(p.body, 140)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {p.author.name ?? p.author.email} · {formatDateTime(p.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sağ kolon — Genel ve Çalışma Grubu Bildirimleri dikey yığın */}
        <div className="flex flex-col gap-6">
        {/* Genel Bildirimler — Notice scope=GENERAL */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Genel Bildirimler
            </CardTitle>
            <div className="flex items-center gap-1">
              <Badge variant="outline">DFT</Badge>
              <Button asChild size="sm" variant="ghost">
                <Link href="/duyurular?kanal=genel">
                  Tümü
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {generalNotices.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Henüz genel bildirim yok"
                className="border-0 py-6"
              />
            ) : (
              <ul className="divide-y">
                {generalNotices.map((n) => (
                  <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      {n.pinned ? <Pin className="h-3 w-3 text-amber-600" aria-label="Sabit" /> : null}
                      <Link
                        href="/duyurular?kanal=genel"
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {n.title}
                      </Link>
                    </div>
                    {n.eventAt ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CalendarClock className="h-3 w-3" />
                        {formatDateTime(n.eventAt)}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {truncate(n.body, 110)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {n.author.name ?? n.author.email} · {formatDateTime(n.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Çalışma Grubu Bildirimleri — Notice scope=GROUP, kullanıcının grubu (admin: tümü) */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Çalışma Grubu Bildirimleri
            </CardTitle>
            <div className="flex items-center gap-1">
              {user.groupCode ? (
                <Badge variant="outline" className={groupBadgeClass(user.groupCode)}>{user.groupCode}</Badge>
              ) : admin ? (
                <Badge variant="outline">Tüm gruplar</Badge>
              ) : null}
              {user.groupId || admin ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href="/duyurular?kanal=grup">
                    Tümü
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!user.groupId && !admin ? (
              <EmptyState
                icon={Megaphone}
                title="Henüz bir çalışma grubunuz yok"
                description="Yöneticiniz grubu atadıktan sonra bildirimler burada görünür."
                className="border-0 py-6"
              />
            ) : groupNotices.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Grup bildirimi yok"
                className="border-0 py-6"
              />
            ) : (
              <ul className="divide-y">
                {groupNotices.map((n) => (
                  <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      {n.pinned ? <Pin className="h-3 w-3 text-amber-600" aria-label="Sabit" /> : null}
                      <Link
                        href="/duyurular?kanal=grup"
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {n.title}
                      </Link>
                      {n.group ? (
                        <Badge variant="outline" className={groupBadgeClass(n.group.code, "shrink-0 text-[10px]")}>{n.group.code}</Badge>
                      ) : null}
                    </div>
                    {n.eventAt ? (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CalendarClock className="h-3 w-3" />
                        {formatDateTime(n.eventAt)}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {truncate(n.body, 110)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {n.author.name ?? n.author.email} · {formatDateTime(n.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Son Paylaşımlar
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/kayitlarim?scope=all">
                Tümü
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <RecentFeedTabs feeds={feeds} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

