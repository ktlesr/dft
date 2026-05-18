import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { FilterSelect } from "@/components/app/filter-select";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { AdminPanelNav } from "@/components/app/admin-nav";
import type { AuditAction } from "@prisma/client";

export const metadata = { title: "Audit log · Yönetim" };
export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<AuditAction, string> = {
  USER_LOGIN: "Giriş",
  USER_LOGIN_FAILED: "Başarısız giriş",
  USER_LOGOUT: "Çıkış",
  USER_SIGNUP: "Kayıt",
  USER_APPROVED: "Kullanıcı onayı",
  USER_REJECTED: "Kullanıcı reddi",
  USER_SUSPENDED: "Askıya alma",
  USER_DELETED: "Kullanıcı silindi",
  USER_ROLE_ADDED: "Rol eklendi",
  USER_ROLE_REMOVED: "Rol kaldırıldı",
  USER_GROUP_CHANGED: "Grup değişikliği",
  INVITE_CREATED: "Davet oluşturuldu",
  INVITE_REVOKED: "Davet iptal",
  INVITE_ACCEPTED: "Davet kabul",
  BOARD_POST_CREATED: "Pano paylaşım",
  BOARD_POST_UPDATED: "Pano güncellendi",
  BOARD_POST_REMOVED: "Pano kaldırıldı",
  NOTICE_CREATED: "Bildirim oluşturuldu",
  NOTICE_UPDATED: "Bildirim güncellendi",
  NOTICE_REMOVED: "Bildirim kaldırıldı",
  MEETING_CREATED: "Toplantı oluşturuldu",
  MEETING_UPDATED: "Toplantı güncellendi",
  MEETING_REMOVED: "Toplantı kaldırıldı",
  MINUTE_CREATED: "Tutanak oluşturuldu",
  MINUTE_UPDATED: "Tutanak güncellendi",
  REPORT_CREATED: "Rapor oluşturuldu",
  REPORT_UPDATED: "Rapor güncellendi",
  DOCUMENT_UPLOADED: "Belge yüklendi",
  DOCUMENT_REMOVED: "Belge kaldırıldı",
  RECORD_CREATED: "Kayıt oluşturuldu",
  RECORD_UPDATED: "Kayıt güncellendi",
  RECORD_DELETED: "Kayıt silindi",
  RECORD_RESTORED: "Kayıt geri alındı",
  SETTINGS_CHANGED: "Ayar değişti",
};

type SearchParams = Promise<{ action?: string; actor?: string; target?: string }>;

function isAuditAction(v?: string): v is AuditAction {
  return !!v && v in ACTION_LABELS;
}

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { action, actor, target } = await searchParams;
  const filterAction = isAuditAction(action) ? action : undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(filterAction ? { action: filterAction } : {}),
      ...(actor ? { actorId: actor } : {}),
      ...(target ? { targetId: target } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true, email: true } } },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Audit log"
        description="Kritik eylemler — giriş, onay, rol/grup değişikliği, pano/toplantı/rapor/belge işlemleri."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "Audit log" }]}
      />
      <AdminPanelNav />

      <form action="/yonetim/loglar" className="mb-4 flex flex-wrap gap-2">
        <FilterSelect
          param="action"
          value={filterAction}
          options={(Object.keys(ACTION_LABELS) as AuditAction[]).map((k) => ({
            value: k,
            label: ACTION_LABELS[k],
          }))}
          placeholder="Tüm eylemler"
          allLabel="Tüm eylemler"
          ariaLabel="Eylem filtresi"
          className="min-w-[220px]"
        />
        {action || actor || target ? (
          <Button asChild variant="ghost">
            <Link href="/yonetim/loglar">Temizle</Link>
          </Button>
        ) : null}
      </form>

      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <EmptyState title="Kayıt yok" className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium">Eylem</th>
                    <th className="px-4 py-3 font-medium">Aktör</th>
                    <th className="px-4 py-3 font-medium">Hedef</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                    <th className="px-4 py-3 font-medium">Meta</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((l) => (
                    <tr key={l.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(l.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{ACTION_LABELS[l.action]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {l.actor?.name ?? l.actor?.email ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {l.targetType ? (
                          <span>
                            <span className="text-muted-foreground">{l.targetType}</span>
                            {l.targetId ? (
                              <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                {l.targetId.slice(0, 8)}…
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {l.ipAddress ?? "—"}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        {l.metadata ? (
                          <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] text-muted-foreground">
                            {JSON.stringify(l.metadata, null, 0)}
                          </pre>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
