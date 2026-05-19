import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportForm } from "@/features/report/report-form";
import { requireActiveUser } from "@/lib/current-user";
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
  if (!canCreateReport(user, user.groupId)) redirect("/yetkisiz");

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Rapor Ekle"
        description="T\u00fcrler \u2014 Yol Haritas\u0131, 1. 4 Ayl\u0131k Rapor, 2. 4 Ayl\u0131k Rapor, 3. 4 Ayl\u0131k Rapor, Kapan\u0131\u015f Raporu. Ba\u015fl\u0131k zorunludur; d\u00f6nem ba\u015flang\u0131c\u0131, d\u00f6nem biti\u015fi ve \u00f6zet alanlar\u0131 iste\u011fe ba\u011fl\u0131d\u0131r. Ek dosya y\u00fckleyebilirsiniz."
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
