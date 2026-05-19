import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportForm } from "@/features/report/report-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { canCreateReport } from "@/lib/rbac";

export const metadata = { title: "Rapor Ekle" };
export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const user = await requireActiveUser();
  if (!user.groupId) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Rapor Ekle" breadcrumbs={[{ label: "Rapor" }]} />
        <EmptyState icon={Users} title="Bir çalışma grubuna atanmadınız" />
      </div>
    );
  }
  if (!canCreateReport(user, user.groupId)) await redirectUnauthorized();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Rapor Ekle"
        description="Tür: Yol Haritası, 1. 4 Aylık, 2. 4 Aylık, 3. 4 Aylık ve Kapanış Raporu. Başlık zorunludur; dönem tarihleri ve özet isteğe bağlıdır."
        breadcrumbs={[{ label: "Rapor" }]}
      />
      <Alert className="mb-4">
        <AlertDescription>
          Raporlar yalnızca grup üyelerine görünür. Yayınlandıktan sonra grup üyelerine bildirim gönderilir.
        </AlertDescription>
      </Alert>
      <ReportForm />
    </div>
  );
}
