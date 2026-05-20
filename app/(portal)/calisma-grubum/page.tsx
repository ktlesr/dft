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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { groupBadgeClass } from "@/lib/group-badge";
import { getFixedKpiOverview, listCustomKpisForUser } from "@/lib/kpi/queries";
import { prisma } from "@/lib/prisma";
import { canCreateOrApproveKpi, canCreateReport } from "@/lib/rbac";
import { BOARD_KIND_LABELS, GROUP_NOTE_KIND_LABELS, REPORT_KIND_LABELS } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";
import { listGroupDiscussions } from "@/features/forum/queries";
import { UserCard } from "@/features/users/user-card";
import { CustomKpiManagement } from "@/features/kpi/custom-kpi-management";
import { FixedKpiManagement } from "@/features/kpi/fixed-kpi-management";

export const metadata = { title: "Çalışma Grubum" };
export const dynamic = "force-dynamic";
const DFT_ADMIN_EMAIL = "admin@dft.ktlsr.com";

const VALID_TABS = [
  "ozet",
  "forum",
  "bildirimler",
  "toplantilar",
  "raporlar",
  "kpi",
  "notlar",
  "uyeler",
] as const;
type GroupTab = (typeof VALID_TABS)[number];

type GroupSearchParams = Promise<{ tab?: string; grup?: string; tumGruplar?: string }>;

export default async function MyGroupPage({ searchParams }: { searchParams: GroupSearchParams }) {
  const user = await requireActiveUser();
  const { tab, grup, tumGruplar } = await searchParams;
  const isAdminUser = user.roles.includes("ADMIN");
  const adminAllGroupsMode = isAdminUser && tumGruplar === "1";

  const adminGroups = adminAllGroupsMode
    ? await prisma.group.findMany({
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true, description: true },
      })
    : [];

  const selectedAdminGroup =
    adminAllGroupsMode
      ? adminGroups.find((g) => g.id === grup) ?? adminGroups[0] ?? null
      : null;

  const viewGroupId = adminAllGroupsMode ? selectedAdminGroup?.id ?? null : user.groupId;
  const viewGroupCode = adminAllGroupsMode ? selectedAdminGroup?.code ?? null : user.groupCode;
  const viewGroupDescription = adminAllGroupsMode
    ? selectedAdminGroup?.description ?? null
    : user.groupDescription;
  const activeTab: GroupTab = (VALID_TABS as readonly string[]).includes(tab ?? "")
    ? (tab as GroupTab)
    : "ozet";

  if (!viewGroupId || !viewGroupCode) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title={adminAllGroupsMode ? "Çalışma Grupları" : "Çalışma Grubum"}
          breadcrumbs={[{ label: adminAllGroupsMode ? "Çalışma Grupları" : "Çalışma Grubum" }]}
        />
        <EmptyState
          icon={Users}
          title={adminAllGroupsMode ? "Henüz tanımlı çalışma grubu yok" : "Henüz bir çalışma grubuna atanmadınız"}
          description={adminAllGroupsMode ? "Yönetim panelinden grup oluşturduktan sonra bu alan aktif olur." : "Yöneticiniz grubu atadıktan sonra bu alan aktif olur."}
        />
      </div>
    );
  }

  const [
    group,
    members,
    bildirimler,
    discussions,
    meetings,
    meetingResults,
    reports,
    reportTemplates,
    notes,
    kpiOverview,
    customKpis,
    fixedTargets,
  ] = await Promise.all([
    prisma.group.findUnique({ where: { id: viewGroupId } }),
    prisma.user.findMany({
      where: {
        groupId: viewGroupId,
        status: "ACTIVE",
        NOT: { email: { equals: DFT_ADMIN_EMAIL, mode: "insensitive" } },
      },
      orderBy: { name: "asc" },
      include: {
        roles: { select: { role: true } },
        profile: {
          select: {
            title: true,
            position: true,
            organization: true,
            phone: true,
            city: true,
            expertise: true,
          },
        },
      },
    }),
    prisma.notice.findMany({
      where: {
        scope: "GROUP",
        groupId: viewGroupId,
        deletedAt: null,
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 20,
      include: {
        author: { select: { name: true, email: true } },
        attachments: { select: { id: true, originalName: true, size: true } },
      },
    }),
    listGroupDiscussions({ groupId: viewGroupId, take: 50 }),
    prisma.meeting.findMany({
      where: { groupId: viewGroupId, deletedAt: null },
      orderBy: { startAt: "desc" },
      take: 20,
      include: {
        attachments: { select: { id: true, originalName: true, size: true } },
      },
    }),
    prisma.meetingResult.findMany({
      where: {
        deletedAt: null,
        OR: [
          { scope: "GENEL" },
          {
            scope: "MRDK",
            OR: [
              { mrdkTarget: "ALL" },
              {
                mrdkTarget: "SPECIFIC",
                targetGroupIds: { has: viewGroupId },
              },
            ],
          },
        ],
      },
      orderBy: { startAt: "desc" },
      include: {
        attachments: { select: { id: true, originalName: true, size: true } },
      },
    }),
    prisma.report.findMany({
      where: { groupId: viewGroupId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.reportTemplate.findMany({
      where: {
        deletedAt: null,
        OR: [
          { scope: "GENEL" },
          { scope: "GROUPS", targetGroupIds: { has: viewGroupId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        attachments: { select: { id: true, originalName: true } },
      },
      take: 50,
    }),
    prisma.groupNote.findMany({
      where: {
        OR: [
          { groupId: viewGroupId },
          { scope: "GENERAL" },
        ],
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        author: { select: { name: true, email: true } },
        attachments: { select: { id: true, originalName: true, size: true } },
      },
    }),
    getFixedKpiOverview(user, viewGroupId),
    listCustomKpisForUser(user),
    prisma.kpiFixedTarget.findMany({
      where: { groupId: viewGroupId },
    }),
  ]);

  const moderators = members.filter((m) => m.roles.some((r) => r.role === "MODERATOR"));
  const rapporteurs = members.filter((m) => m.roles.some((r) => r.role === "RAPPORTEUR"));
  const canCreateAdvisorNote = user.roles.includes("ADMIN") || user.roles.includes("ADVISOR");
  const canCreateKsNote = user.roles.includes("ADMIN") || user.roles.includes("KS");
  const canCreateNotes = canCreateAdvisorNote || canCreateKsNote;
  const canCreateGroupReport = canCreateReport(user, viewGroupId);
  const advisorNotes = notes.filter((n) => n.kind === "ADVISOR_NOTE");
  const ksNotes = notes.filter((n) => n.kind === "KS_NOTE");

  const combinedMeetings = [
    ...meetings.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      startAt: m.startAt,
      endAt: m.endAt,
      type: "MEETING" as const,
      attachments: m.attachments,
    })),
    ...meetingResults.map((mr) => ({
      id: mr.id,
      title: mr.title,
      description: mr.description,
      startAt: mr.startAt,
      endAt: mr.endAt,
      type: "RESULT" as const,
      scope: mr.scope,
      attachments: mr.attachments,
    })),
  ].sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={adminAllGroupsMode ? `Çalışma Grupları · ${viewGroupCode}` : `Çalışma Grubum · ${viewGroupCode}`}
        description={viewGroupDescription ?? undefined}
        breadcrumbs={[{ label: adminAllGroupsMode ? "Çalışma Grupları" : "Çalışma Grubum" }]}
        actions={
          <Button asChild variant="secondary">
            <Link href="/panolar/grup">
              <Megaphone className="h-4 w-4" />
              Grup Panosu
            </Link>
          </Button>
        }
      />

      {adminAllGroupsMode ? (
        <div className="mb-4 overflow-x-auto">
          <div className="flex min-w-max gap-1 border-b pb-1">
            {adminGroups.map((g) => {
              const active = g.id === viewGroupId;
              const href = `/calisma-gruplari?tumGruplar=1&grup=${encodeURIComponent(g.id)}&tab=${encodeURIComponent(activeTab)}`;
              return (
                <Link
                  key={g.id}
                  href={href}
                  className={cn(
                    "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                  )}
                >
                  {g.code}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <Tabs defaultValue={activeTab}>
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
              <Field
                label="Grup kodu"
                value={
                  <Badge variant="outline" className={groupBadgeClass(viewGroupCode)}>
                    {viewGroupCode}
                  </Badge>
                }
              />
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
                <CardTitle className="text-base">Son Kayıtlar</CardTitle>
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
                const eventStartAt = (b as { eventStartAt?: Date | null }).eventStartAt ?? null;
                const eventEndAt = (b as { eventEndAt?: Date | null }).eventEndAt ?? null;
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
                        {eventStartAt || eventEndAt || b.eventAt ? (
                          <p className="mt-1.5 text-[11px] font-medium text-primary">
                            {eventStartAt && eventEndAt
                              ? `${formatDateTime(eventStartAt)} - ${formatDateTime(eventEndAt)}`
                              : formatDateTime(eventStartAt ?? eventEndAt ?? b.eventAt!)}
                          </p>
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
                        {b.attachments.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {b.attachments.map((a) => (
                              <a
                                key={a.id}
                                href={`/api/dosya/${a.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border px-2 py-0.5 text-[11px] hover:border-primary hover:text-primary"
                              >
                                {a.originalName}
                                <span className="text-muted-foreground"> · {humanSize(a.size)}</span>
                              </a>
                            ))}
                          </div>
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
          {combinedMeetings.length === 0 ? (
            <EmptyState title="Henüz toplantı yok" icon={CalendarDays} />
          ) : (
            <div className="rounded-md border overflow-x-auto bg-card">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="p-4">Başlık</th>
                    <th className="p-4">Tür / Kapsam</th>
                    <th className="p-4">Açıklama</th>
                    <th className="p-4">Başlangıç Tarihi</th>
                    <th className="p-4">Toplantı Bitiş Tarihi</th>
                    <th className="p-4">Dosya / İndir</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm">
                  {combinedMeetings.map((item) => {
                    const isResult = item.type === "RESULT";
                    return (
                      <tr key={`${item.type}-${item.id}`} className="hover:bg-muted/10 transition-colors">
                        <td className="p-4 font-medium max-w-[200px] truncate" title={item.title}>
                          {item.title}
                        </td>
                        <td className="p-4">
                          {isResult ? (
                            <Badge variant="default" className="font-semibold text-xs">
                              Sonuç {item.scope === "MRDK" ? "(MRDK)" : "(Genel)"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-semibold text-xs">
                              Grup Toplantısı
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 max-w-[250px] truncate text-muted-foreground text-xs" title={item.description ?? ""}>
                          {item.description || "—"}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.startAt)}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                          {item.endAt ? formatDateTime(item.endAt) : "—"}
                        </td>
                        <td className="p-4">
                          {item.attachments.length > 0 ? (
                            <div className="flex flex-col gap-1 max-w-[180px]">
                              {item.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={`/api/dosya/${att.id}`}
                                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline truncate"
                                  title={att.originalName}
                                  download
                                >
                                  📎 <span className="truncate">{att.originalName}</span>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="raporlar">
          <div className="mb-4 flex items-center justify-end">
            {canCreateGroupReport ? (
              <Button asChild variant="brand" size="sm">
                <Link href="/rapor/yeni">
                  <FileText className="h-4 w-4" />
                  Rapor Ekle
                </Link>
              </Button>
            ) : null}
          </div>
          <Tabs defaultValue="grup-raporlari" className="space-y-4">
            <TabsList>
              <TabsTrigger value="grup-raporlari">Raporlar</TabsTrigger>
              <TabsTrigger value="sablonlar">Şablonlar</TabsTrigger>
            </TabsList>

            <TabsContent value="sablonlar">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Şablonlar</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportTemplates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Bu kapsamda görüntüleyebileceğiniz şablon bulunmuyor.</p>
                  ) : (
                    <ul className="space-y-2">
                      {reportTemplates.map((t) => (
                        <li key={t.id} className="rounded-md border p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{t.title}</p>
                              {t.description ? (
                                <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                              ) : null}
                            </div>
                            <Badge variant={t.scope === "GENEL" ? "secondary" : "outline"}>
                              {t.scope === "GENEL" ? "Genel" : "Belli Gruplar"}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {t.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={`/api/dosya/${att.id}`}
                                className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/5"
                                download
                              >
                                İndir: {att.originalName}
                              </a>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grup-raporlari">
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
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="kpi" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Bu sekmedeki KPI metrikleri grup üyelerinin girdiği kayıtlardan otomatik hesaplanır.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/kpi">KPI Takip</Link>
              </Button>
              <Button asChild variant="brand" size="sm">
                <Link href="/kpi/yeni">KPI Ekle</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpiOverview.summaries.map((item) => (
              <Card key={item.code}>
                <CardContent className="p-4">
                  <p className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {item.value} / {item.targetValue ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <FixedKpiManagement
            groupId={viewGroupId}
            isModerator={canCreateOrApproveKpi(user, viewGroupId)}
            summaries={kpiOverview.summaries}
            fixedTargets={fixedTargets.map((t) => ({
              id: t.id,
              metricCode: t.metricCode as any,
              targetValue: t.targetValue ? t.targetValue.toString() : null,
              targetDate: t.targetDate,
              baselineValue: t.baselineValue ? t.baselineValue.toString() : null,
              baselineDate: t.baselineDate,
            }))}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grup KPI Özeti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">Grup</th>
                      {kpiOverview.summaries.map((item) => (
                        <th key={item.code} className="px-2 py-2">
                          {item.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {kpiOverview.groupRows.map((row) => (
                      <tr key={row.groupId} className="border-b last:border-0">
                        <td className="px-2 py-2 font-medium">{row.groupCode}</td>
                        {kpiOverview.summaries.map((item) => (
                          <td key={`${row.groupId}-${item.code}`} className="px-2 py-2">
                            {row.values[item.code]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {customKpis.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">Özel KPI Kayıtları</CardTitle>
                <Badge variant="outline">{customKpis.length} kayıt</Badge>
              </CardHeader>
              <CardContent>
                <CustomKpiManagement
                  kpis={customKpis}
                  isAdmin={user.roles.includes("ADMIN")}
                  currentGroupId={viewGroupId}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="notlar">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Danışman ve Kalite Sorumlusu notları ayrı alanlarda listelenir.
            </p>
            {canCreateNotes ? (
              <div className="flex flex-wrap items-center gap-2">
                {canCreateAdvisorNote ? (
                  <Button asChild variant="brand" size="sm">
                    <Link href="/not/yeni?kind=ADVISOR_NOTE">
                      <NotebookPen className="h-4 w-4" />
                      Danışman Notu Ekle
                    </Link>
                  </Button>
                ) : null}
                {canCreateKsNote ? (
                  <Button asChild variant="brand" size="sm">
                    <Link href="/not/yeni?kind=KS_NOTE">
                      <NotebookPen className="h-4 w-4" />
                      Kalite Sorumlusu Notu Ekle
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {advisorNotes.length === 0 && ksNotes.length === 0 ? (
            <EmptyState
              title="Henüz not yok"
              description="İlk notu eklediğinizde burada görünür."
              icon={NotebookPen}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <NoteColumn
                title={GROUP_NOTE_KIND_LABELS.ADVISOR_NOTE}
                notes={advisorNotes}
                emptyText="Danışman notu yok."
              />
              <NoteColumn
                title={GROUP_NOTE_KIND_LABELS.KS_NOTE}
                notes={ksNotes}
                emptyText="KS notu yok."
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="uyeler">
          {members.length === 0 ? (
            <EmptyState title="Üye yok" icon={Users} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((m) => (
                <UserCard
                  key={m.id}
                  variant="member"
                  user={{
                    id: m.id,
                    name: m.name,
                    email: m.email,
                    image: m.image,
                    roles: m.roles,
                    profile: m.profile,
                  }}
                />
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
function humanSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type NoteListItem = {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  author: { name: string | null; email: string };
  attachments: { id: string; originalName: string; size: number }[];
};

function NoteColumn({
  title,
  notes,
  emptyText,
}: {
  title: string;
  notes: NoteListItem[];
  emptyText: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => {
              const authorName = n.author.name?.trim() || n.author.email.split("@")[0];
              return (
                <li key={n.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{n.title}</p>

                      <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{n.body}</p>

                      {n.attachments.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {n.attachments.map((a) => (
                            <a
                              key={a.id}
                              href={`/api/dosya/${a.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border px-2 py-0.5 text-[11px] hover:border-primary hover:text-primary"
                            >
                              {a.originalName}
                              <span className="text-muted-foreground"> · {humanSize(a.size)}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}

                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {authorName} · {formatDateTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
