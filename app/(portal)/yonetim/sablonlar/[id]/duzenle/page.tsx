import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateReportTemplate } from "@/features/report-template/actions";
import { ReportTemplateForm } from "@/features/report-template/report-template-form";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Şablon Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditReportTemplatePage({ params }: { params: Params }) {
  const { id } = await params;
  await requireAdmin();
  const [template, groups] = await Promise.all([
    prisma.reportTemplate.findUnique({ where: { id } }),
    prisma.group.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);
  if (!template || template.deletedAt) notFound();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Şablon Düzenle"
        breadcrumbs={[
          { label: "Şablonlar", href: "/yonetim/sablonlar" },
          { label: "Düzenle" },
        ]}
      />
      <ReportTemplateForm
        groups={groups}
        action={updateReportTemplate.bind(null, id)}
        submitLabel="Şablonu güncelle"
        defaults={{
          title: template.title,
          description: template.description,
          scope: template.scope as "GENEL" | "GROUPS",
          targetGroupIds: template.targetGroupIds,
        }}
      />
    </div>
  );
}
