import Link from "next/link";
import { CalendarDays, FileText, Megaphone, Paperclip, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  BOARD_KIND_LABELS,
  REPORT_KIND_LABELS,
  ROLE_LABELS,
} from "@/lib/constants";
import { avatarUrl, formatDate, formatDateTime, initials } from "@/lib/utils";

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

  const [group, members, posts, meetings, minutes, reports, docs] = await Promise.all([
    prisma.group.findUnique({ where: { id: user.groupId } }),
    prisma.user.findMany({
      where: { groupId: user.groupId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { roles: { select: { role: true } } },
    }),
    prisma.boardPost.findMany({
      where: {
        scope: "GROUP",
        groupId: user.groupId,
        deletedAt: null,
        status: "PUBLISHED",
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 6,
    }),
    prisma.meeting.findMany({
      where: { groupId: user.groupId, deletedAt: null },
      orderBy: { startAt: "desc" },
      take: 10,
    }),
    prisma.meetingMinute.findMany({
      where: { meeting: { groupId: user.groupId }, deletedAt: null },
      orderBy: { date: "desc" },
      take: 10,
      include: { meeting: { select: { title: true } } },
    }),
    prisma.groupReport.findMany({
      where: { groupId: user.groupId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.document.findMany({
      where: { groupId: user.groupId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { attachments: { select: { id: true, originalName: true, size: true } } },
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
          <TabsTrigger value="pano">Pano</TabsTrigger>
          <TabsTrigger value="toplantilar">Toplantılar</TabsTrigger>
          <TabsTrigger value="tutanaklar">Tutanaklar</TabsTrigger>
          <TabsTrigger value="raporlar">Raporlar</TabsTrigger>
          <TabsTrigger value="belgeler">Belgeler</TabsTrigger>
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
                {posts.length === 0 ? (
                  <EmptyState className="border-0 py-6" title="Paylaşım yok" icon={Megaphone} />
                ) : (
                  <ul className="space-y-2">
                    {posts.slice(0, 4).map((p) => (
                      <li key={p.id} className="text-sm">
                        <Link href="/panolar/grup" className="font-medium hover:text-primary">
                          {p.title}
                        </Link>
                        <span className="ml-2 text-[11px] text-muted-foreground">
                          {formatDateTime(p.publishedAt)}
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

        <TabsContent value="pano">
          {posts.length === 0 ? (
            <EmptyState title="Grup panosunda paylaşım yok" icon={Megaphone} />
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li key={p.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href="/panolar/grup" className="font-medium hover:text-primary">
                        {p.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(p.publishedAt)}
                      </p>
                    </div>
                    <Badge variant="secondary">{BOARD_KIND_LABELS[p.kind]}</Badge>
                  </div>
                </li>
              ))}
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

        <TabsContent value="tutanaklar">
          {minutes.length === 0 ? (
            <EmptyState title="Henüz tutanak yok" icon={FileText} />
          ) : (
            <ul className="space-y-2">
              {minutes.map((m) => (
                <li key={m.id} className="rounded-md border p-4">
                  <p className="font-medium">{m.meeting?.title ?? "Tutanak"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(m.date)}</p>
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

        <TabsContent value="belgeler">
          {docs.length === 0 ? (
            <EmptyState title="Grup belgesi yok" icon={FileText} />
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li key={d.id} className="rounded-md border p-4">
                  <p className="font-medium">{d.title}</p>
                  {d.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.attachments.map((a) => (
                      <Link
                        key={a.id}
                        href={`/api/dosya/${a.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {a.originalName}
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
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
