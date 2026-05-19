import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardPlus, ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomKpiForm } from "@/features/kpi/custom-kpi-form";
import { CustomKpiManagement } from "@/features/kpi/custom-kpi-management";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { listAssignableUsersForGroup, listCustomKpisForUser } from "@/lib/kpi/queries";
import { canAccessKpiModule, canCreateOrApproveKpi, isAdmin } from "@/lib/rbac";

export const metadata = { title: "KPI Ekle" };

export default async function NewKpiPage() {
  const user = await requireActiveUser();
  if (!canAccessKpiModule(user)) await redirectUnauthorized();

  if (!user.groupId && !user.roles.includes("ADMIN")) {
    redirect("/kpi");
  }

  const [customKpis, assignableUsers] = await Promise.all([
    listCustomKpisForUser(user),
    user.groupId ? listAssignableUsersForGroup(user.groupId) : Promise.resolve([]),
  ]);
  const canCreate = !!user.groupId && canCreateOrApproveKpi(user, user.groupId);
  const admin = isAdmin(user);
  const groupLabel = [user.groupCode, user.groupName].filter(Boolean).join(" - ");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="KPI Ekle"
        description="Sabit KPI disinda yeni KPI tanimlari bu ekran uzerinden eklenecek."
        breadcrumbs={[
          { label: "KPI Takip", href: "/kpi" },
          { label: "KPI Ekle" },
        ]}
      />

      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Yetki notu</AlertTitle>
        <AlertDescription>
          Yeni KPI girisi ve onayi moderatordedir. Admin rolunde bu ekranda izleme ve sonraki
          asamada baseline revizyonu yapabilirsiniz.
        </AlertDescription>
      </Alert>

      {canCreate && user.groupId ? (
        <CustomKpiForm
          groupId={user.groupId}
          groupLabel={groupLabel || user.groupId}
          members={assignableUsers}
        />
      ) : (
        <EmptyState
          icon={ClipboardPlus}
          title="Bu rolde yeni KPI girisi kapali"
          description="Yine de olusturulmus KPI kayitlarini asagidaki listeden takip edebilirsiniz."
          action={
            <Button asChild variant="outline">
              <Link href="/kpi">KPI Takip ekranina don</Link>
            </Button>
          }
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Ozel KPI Kayitlari</CardTitle>
          <Badge variant="outline">{customKpis.length} kayit</Badge>
        </CardHeader>
        <CardContent>
          <CustomKpiManagement kpis={customKpis} isAdmin={admin} currentGroupId={user.groupId} />
        </CardContent>
      </Card>
    </div>
  );
}
