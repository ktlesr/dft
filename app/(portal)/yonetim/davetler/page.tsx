import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { NewInviteForm } from "@/features/invites/new-invite-form";
import { revokeInvite } from "@/features/invites/actions";

export const metadata = { title: "Davetler · Yönetim" };
export const dynamic = "force-dynamic";

export default async function AdminInvitesPage() {
  await requireAdmin();

  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      createdBy: { select: { name: true, email: true } },
      // Group relation isn't modeled directly — fetch separately.
    },
  });

  const groups = await prisma.group.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, description: true },
  });
  const groupMap = new Map(groups.map((g) => [g.id, g.code]));
  const inviteFormGroups = groups.map((g) => ({ code: g.code, description: g.description }));

  const now = Date.now();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Davetler"
        description="Davet bağlantıları oluşturun ve kabul / iptal durumlarını takip edin."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "Davetler" }]}
      />
      <AdminPanelNav />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Yeni davet</CardTitle>
        </CardHeader>
        <CardContent>
          <NewInviteForm groups={inviteFormGroups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mevcut davetler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {invites.length === 0 ? (
            <EmptyState title="Henüz davet yok" className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">E-posta</th>
                    <th className="px-4 py-3 font-medium">Grup</th>
                    <th className="px-4 py-3 font-medium">Roller</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Süre</th>
                    <th className="px-4 py-3 text-right font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invites.map((inv) => {
                    const expired = inv.expiresAt.getTime() < now && inv.status === "PENDING";
                    const effectiveStatus = expired ? "EXPIRED" : inv.status;
                    return (
                      <tr key={inv.id} className="transition-colors hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="truncate">{inv.email}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {inv.createdBy?.name ?? inv.createdBy?.email} · {formatDateTime(inv.createdAt)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {inv.groupId ? (
                            <Badge variant="outline">{groupMap.get(inv.groupId) ?? "—"}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {inv.roles.length === 0 ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {ROLE_LABELS.USER}
                              </Badge>
                            ) : (
                              inv.roles.map((r) => (
                                <Badge key={r} variant="secondary" className="text-[10px]">
                                  {ROLE_LABELS[r]}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={effectiveStatus} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {expired || inv.status !== "PENDING"
                            ? formatDateTime(inv.expiresAt)
                            : `${formatDateTime(inv.expiresAt)}`}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {inv.status === "PENDING" && !expired ? (
                            <form action={revokeInvite}>
                              <input type="hidden" name="id" value={inv.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-destructive hover:text-destructive"
                              >
                                İptal et
                              </Button>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
}) {
  const variant =
    status === "ACCEPTED"
      ? "success"
      : status === "PENDING"
        ? "warning"
        : "muted";
  const label =
    status === "PENDING"
      ? "Bekliyor"
      : status === "ACCEPTED"
        ? "Kabul edildi"
        : status === "REVOKED"
          ? "İptal"
          : "Süresi dolmuş";
  return <Badge variant={variant as "success" | "warning" | "muted"}>{label}</Badge>;
}
