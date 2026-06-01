import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateReport } from "@/features/report/actions";
import { ReportForm } from "@/features/report/report-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";

export const metadata = { title: "Rapor Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditReportPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report || report.deletedAt) notFound();
  if (!isAdmin(user) && (report.authorId !== user.id || report.groupId !== user.groupId)) {
    await redirectUnauthorized();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Rapor Düzenle"
        breadcrumbs={[
          { label: "Rapor", href: `/rapor/${id}` },
          { label: "Düzenle" },
        ]}
      />
      <ReportForm
        defaultKind={report.kind}
        defaults={{ title: report.title, summary: report.summary }}
        action={updateReport.bind(null, id)}
        cancelHref={`/rapor/${id}`}
        submitLabel="Raporu güncelle"
      />
    </div>
  );
}
