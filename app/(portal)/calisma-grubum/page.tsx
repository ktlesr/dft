import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  FileText,
  Megaphone,
  MessageSquare,
  MessageSquarePlus,
  NotebookPen,
  Pin,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { BOARD_KIND_LABELS, REPORT_KIND_LABELS, ROLE_LABELS } from "@/lib/constants";
import { avatarUrl, formatDate, formatDateTime, initials } from "@/lib/utils";
import { listGroupDiscussions } from "@/features/forum/queries";

export const metadata = { title: "Çalışma Grubum" };
export const dynamic = "force-dynamic";

export default async function MyGroupPage() {
  const user = await requireActiveUser();

  if (!user.groupId || !user.groupCode) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Çalışma Grubum"
          breadcrumbs={[{ label: "Çalışma Grubum" }]}
        />
        <EmptyState
          icon={Users}
          title="Henüz bir çalışma grubuna atanmadınız"
          description="Yöneticiniz grubu atadıktan sonra bu alan aktif olur."
        />
      </div>
    );
  }

  const [group, members, bildirimler, discussions, meetings, reports] = await Promise.all([
    prisma.group.findUnique({ where: { id: user.groupId } }),
    prisma.user.findMany({
      where: { groupId: user.groupId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { roles: { select: { role: true } } },
    }),
    // Grup bildirimleri = grup kapsamlı BoardPost'lar. Faz 10'da "Bildirim Ekle"
    // formu bu modeli oluşturur; sekme de buradan okur.
    prisma.boardPost.findMany({
      where: {
        scope: "GROUP",
        groupId: user.groupId,
        deletedAt: null,
        status: "PUBLISHED",
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 20,
      include: {
        author: { select: { name: true, email: true } },
        attachments: { select: { id: true, originalName: true, size: true } },
      },
    }),
    listGroupDiscussions({ groupId: user.groupId, take: 50 }),
    prisma.meeting.findMany({
      where: { groupId: user.groupId, deletedAt: null },
      orderBy: { startAt: "desc" },
      take: 10,
    }),
    prisma.groupReport.findMany({
      where: { groupId: user.groupId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const moderators = members.filter((m) => m.roles.some((r) => r.role === "MODERATOR"));
  const rapporteurs = members.filter((m) => m.roles.some((r) => r.role === "RAPPORTEUR"));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={`Çalışma Grubum · ${user.groupCode}`}
        description={user.groupDescription ?? undefined}
        breadcrumbs={[{ label: "Çalışma Grubum" }]}
        actions={
          <Button asChild variant="secondary">
            <Link href="/panolar/grup">
              <Megaphone className="h-4 w-4" />
              Grup Panosu
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="ozet">
        <TabsList>
          <TabsTrigger value="ozet">Özet</TabsTrigger>
          <TabsTrigger value="forum">Forum</TabsTrigger>
          <TabsTrigger value="bildirimler">Bildirimler</TabsTrigger>
          <TabsTrigger value="toplantilar">Toplantılar</TabsTrigger>
          <TabsTrigger value="raporlar">Raporlar</TabsTrigger>
          <TabsTrigger value="kpi">KPI</TabsTrigger>
          <TabsTrigger value="notlar">Danışman / KS Notları</TabsTrigger>
          <TabsTrigger value="uyeler">Üyeler</TabsTrigger>
        </TabsList>

        <TabsContent value="ozet" className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 p-6 md:grid-cols-4">
              <Field label="Grup kodu" value={<Badge variant="success">{user.groupCode}</Badge>} />
              <Field label="Üye sayısı" value={`${members.length} kişi`} />
              <Field label="Moderatör" value={moderators[0]?.name ?? moderators[0]?.email ?? "—"} />
              <Field label="Raportör" value={rapporteurs[0]?.name ?? rapporteurs[0]?.email ?? "—"} />
              {group?.description ? (
                <div className="md:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Açıklama</p>
                  <p className="mt-1 text-sm">{group.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Son paylaşımlar</CardTitle>
              </CardHeader>
              <CardContent>
                {discussions.length === 0 ? (
                  <EmptyState className="border-0 py-6" title="Forum konusu yok" icon={MessageSquare} />
                ) : (
                  <ul className="space-y-2">
                    {discussions.slice(0, 4).map((d) => (
                      <li key={d.id} className="text-sm">
                        <Link href={`/forum/${d.id}`} className="font-medium hover:text-primary">
                          {d.title}
                        </Link>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {formatDateTime(d.updatedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Son toplantılar</CardTitle>
              </CardHeader>
              <CardContent>
                {meetings.length === 0 ? (
                  <EmptyState className="border-0 py-6" title="Toplantı yok" icon={CalendarDays} />
                ) : (
                  <ul className="space-y-2">
                    {meetings.slice(0, 4).map((m) => (
                      <li key={m.id} className="text-sm">
                        <span className="font-medium">{m.title}</span>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {formatDateTime(m.startAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forum">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Grup üyelerinin başlattığı konular — en son yanıtlananlar üstte.
            </p>
            <Button asChild variant="brand" size="sm">
              <Link href="/forum/yeni">
                <MessageSquarePlus className="h-4 w-4" />
                Yeni konu
              </Link>
            </Button>
          </div>

          {discussions.length === 0 ? (
            <EmptyState
              title="Henüz konu açılmadı"
              description="İlk konuyu siz başlatın — tüm grup üyeleri görür ve yanıt verebilir."
              icon={MessageSquare}
            />
          ) : (
            <ul className="space-y-2">
              {discussions.map((d) => {
                const authorName = d.author.name?.trim() || d.author.email.split("@")[0];
                return (
                  <li key={d.id}>
                    <Link
                      href={`/forum/${d.id}`}
                      className="block rounded-md border p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {d.pinned ? (
                              <Pin className="h-3 w-3 shrink-0 text-amber-600" aria-label="Sabit" />
                            ) : null}
                            <p className="truncate font-medium hover:text-primary">{d.title}</p>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {d.body}
                          </p>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {authorName} · {formatDateTime(d.updatedAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{d._count.replies}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="bildirimler">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Yöneticilerin ve grup moderatörünün bu gruba yayımladığı bildirimler.
            </p>
            <Button asChild variant="brand" size="sm">
              <Link href="/bildirim/yeni">
                <Megaphone className="h-4 w-4" />
                Bildirim Ekle
              </Link>
            </Button>
          </div>

          {bildirimler.length === 0 ? (
            <EmptyState title="Grup bildirimi yok" icon={Megaphone} />
          ) : (
            <ul className="space-y-2">
              {bildirimler.map((b) => {
                const authorName = b.author.name?.trim() || b.author.email.split("@")[0];
                return (
                  <li key={b.id} className="rounded-md border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {b.pinned ? (
                            <Pin className="h-3 w-3 shrink-0 text-amber-600" aria-label="Sabit" />
                          ) : null}
                          <p className="font-medium">{b.title}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {BOARD_KIND_LABELS[b.kind]}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                          {b.body}
                        </p>
                        {b.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {b.tags.map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">
                                #{t}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {b.externalUrl ? (
                          <p className="mt-1.5 truncate text-[11px]">
                            <a
                              href={b.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {b.externalUrl}
                            </a>
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          {authorName} · {formatDateTime(b.publishedAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="toplantilar">
          {meetings.length === 0 ? (
            <EmptyState title="Henüz toplantı yok" icon={CalendarDays} />
          ) : (
            <ul className="space-y-2">
              {meetings.map((m) => (
                <li key={m.id} className="rounded-md border p-4">
                  <p className="font-medium">{m.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(m.startAt)}</p>
                  {m.location ? (
                    <p className="text-xs text-muted-foreground">📍 {m.location}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="raporlar">
          {reports.length === 0 ? (
            <EmptyState title="Henüz rapor yok" icon={FileText} />
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{r.title}</p>
                    <Badge variant="secondary">{REPORT_KIND_LABELS[r.kind]}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="kpi">
          <EmptyState
            title="KPI modülü hazırlık aşamasında"
            description="Grubun performans göstergeleri (toplantı düzenliliği, rapor sayısı, üye katılımı vb.) yakında bu sekmede yayımlanacak."
            icon={BarChart3}
          />
        </TabsContent>

        <TabsContent value="notlar">
          <EmptyState
            title="Danışman / KS Notları hazırlık aşamasında"
            description="Danışman ve KS değerlendirme notları yakında bu sekmede yayımlanacak."
            icon={NotebookPen}
          />
        </TabsContent>

        <TabsContent value="uyeler">
          {members.length === 0 ? (
            <EmptyState title="Üye yok" icon={Users} />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-md border p-3">
                  <Avatar className="h-9 w-9">
                    {m.image ? (
                      <AvatarImage src={avatarUrl(m.id, m.image)} alt={m.name ?? m.email} />
                    ) : null}
                    <AvatarFallback>{initials(m.name, m.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name ?? m.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {m.roles
                      .filter((r) => r.role !== "USER")
                      .map((r) => (
                        <Badge key={r.role} variant="outline" className="text-[10px]">
                          {ROLE_LABELS[r.role]}
                        </Badge>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
