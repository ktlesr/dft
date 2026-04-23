import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  ExternalLink,
  FileText,
  Megaphone,
  Paperclip,
  Pin,
  PlusCircle,
  Presentation,
  Trophy,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { formatDateTime, truncate } from "@/lib/utils";

export const metadata = { title: "Ana Panel" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireActiveUser();

  const [
    cntProjectApps,
    cntSuccess,
    cntEvents,
    cntDissemination,
    generalPosts,
    groupPosts,
    upcomingMeetings,
    recentDocs,
  ] = await Promise.all([
    prisma.projectApplicationRecord.count({ where: { ownerId: user.id, deletedAt: null } }),
    prisma.successfulProjectRecord.count({ where: { ownerId: user.id, deletedAt: null } }),
    prisma.eventRecord.count({ where: { ownerId: user.id, deletedAt: null } }),
    prisma.disseminationRecord.count({ where: { ownerId: user.id, deletedAt: null } }),
    prisma.boardPost.findMany({
      where: { scope: "GENERAL", status: "PUBLISHED", deletedAt: null },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 4,
      include: { author: { select: { name: true, email: true } } },
    }),
    user.groupId
      ? prisma.boardPost.findMany({
          where: { scope: "GROUP", groupId: user.groupId, status: "PUBLISHED", deletedAt: null },
          orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
          take: 4,
          include: { author: { select: { name: true, email: true } } },
        })
      : [],
    user.groupId
      ? prisma.meeting.findMany({
          where: { groupId: user.groupId, deletedAt: null, startAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
          take: 4,
        })
      : [],
    prisma.document.findMany({
      where: {
        deletedAt: null,
        OR: [
          { category: "ORTAK" },
          ...(user.groupId ? [{ groupId: user.groupId }] : []),
          { uploadedById: user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { attachments: { select: { id: true, originalName: true, size: true } } },
    }),
  ]);

  const stats = [
    {
      label: "Proje Başvurularım",
      value: cntProjectApps,
      icon: Briefcase,
      href: "/kayitlarim?tur=proje-basvurusu",
    },
    {
      label: "Başarılı Projelerim",
      value: cntSuccess,
      icon: Trophy,
      href: "/kayitlarim?tur=basarili-proje",
    },
    {
      label: "Etkinlik Kayıtlarım",
      value: cntEvents,
      icon: Presentation,
      href: "/kayitlarim?tur=etkinlik",
    },
    {
      label: "Bilgi Çoğaltımı Kayıtlarım",
      value: cntDissemination,
      icon: Megaphone,
      href: "/kayitlarim?tur=bilgi-cogaltimi",
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

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Genel Panodan Son Paylaşımlar</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/panolar/genel">
                Tümü
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {generalPosts.length === 0 ? (
              <EmptyState icon={Megaphone} title="Henüz paylaşım yok" className="border-0 py-6" />
            ) : (
              <ul className="divide-y">
                {generalPosts.map((p) => (
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

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Yaklaşan Toplantılar</CardTitle>
            {user.groupCode ? <Badge variant="outline">{user.groupCode}</Badge> : null}
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Planlı toplantı yok"
                description={
                  user.groupId
                    ? "Grup moderatörü yeni toplantı eklediğinde burada görünecek."
                    : "Henüz bir çalışma grubunuz yok."
                }
                className="border-0 py-6"
              />
            ) : (
              <ul className="space-y-3">
                {upcomingMeetings.map((m) => (
                  <li key={m.id} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{m.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDateTime(m.startAt)}
                    </p>
                    {m.location ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">📍 {m.location}</p>
                    ) : null}
                    {m.onlineUrl ? (
                      <a
                        href={m.onlineUrl}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Çevrim içi
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Grup Panosundan Gelişmeler</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/panolar/grup">
                Tümü
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!user.groupId ? (
              <EmptyState
                icon={Megaphone}
                title="Henüz bir çalışma grubunuz yok"
                description="Yöneticiniz grubu atadıktan sonra paylaşımlar burada görünür."
                className="border-0 py-6"
              />
            ) : groupPosts.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Grup panosunda henüz paylaşım yok"
                className="border-0 py-6"
              />
            ) : (
              <ul className="divide-y">
                {groupPosts.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      {p.pinned ? <Pin className="h-3 w-3 text-amber-600" aria-label="Sabit" /> : null}
                      <Link
                        href="/panolar/grup"
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

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Son Belgeler</CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link href="/belgeler">
                Tümü
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDocs.length === 0 ? (
              <EmptyState icon={FileText} title="Henüz belge yok" className="border-0 py-6" />
            ) : (
              <ul className="space-y-2">
                {recentDocs.map((d) => (
                  <li key={d.id} className="rounded-md border p-3">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDateTime(d.createdAt)}
                    </p>
                    {d.attachments[0] ? (
                      <Link
                        href={`/api/dosya/${d.attachments[0].id}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Paperclip className="h-3 w-3" />
                        {d.attachments[0].originalName}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
