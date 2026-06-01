import Link from "next/link";
import { Pencil } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { ReportTemplateForm } from "@/features/report-template/report-template-form";

export const metadata = { title: "Şablonlar — Yönetim" };
export const dynamic = "force-dynamic";

function formatGroupList(templateGroupIds: string[], groupsById: Map<string, string>) {
  const labels = templateGroupIds.map((id) => groupsById.get(id)).filter(Boolean) as string[];
  if (labels.length === 0) return "—";
  return labels.join(", ");
}

export default async function AdminReportTemplatesPage() {
  await requireAdmin();

  const [groups, templates] = await Promise.all([
    prisma.group.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.reportTemplate.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        attachments: {
          select: { id: true, originalName: true },
        },
        createdBy: {
          select: { name: true, email: true },
        },
      },
    }),
  ]);

  const groupsById = new Map(groups.map((g) => [g.id, g.code]));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Şablonlar"
        description="Raporlar sekmesinde görünecek şablonları (docx, xlsx, pptx, pdf) ekleyin."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "Şablonlar" }]}
      />
      <AdminPanelNav />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Yeni şablon ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportTemplateForm groups={groups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eklenen şablonlar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <EmptyState title="Henüz şablon eklenmedi" className="border-0" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Başlık</th>
                    <th className="px-4 py-3 font-medium">Kapsam</th>
                    <th className="px-4 py-3 font-medium">Hedef Gruplar</th>
                    <th className="px-4 py-3 font-medium">Dosyalar</th>
                    <th className="px-4 py-3 font-medium">Oluşturan</th>
                    <th className="px-4 py-3 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {templates.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{t.title}</p>
                        {t.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={t.scope === "GENEL" ? "secondary" : "outline"}>
                          {t.scope === "GENEL" ? "Genel" : "Belli Gruplar"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {t.scope === "GENEL" ? "Tüm gruplar" : formatGroupList(t.targetGroupIds, groupsById)}
                      </td>
                      <td className="px-4 py-3">
                        {t.attachments.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {t.attachments.map((a) => (
                              <a
                                key={a.id}
                                href={`/api/dosya/${a.id}`}
                                className="inline-flex items-center gap-2 text-xs text-primary hover:underline"
                                download
                              >
                                İndir: {a.originalName}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div>{t.createdBy.name?.trim() || t.createdBy.email}</div>
                        <div>{formatDateTime(t.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/yonetim/sablonlar/${t.id}/duzenle`}>
                            <Pencil className="h-3.5 w-3.5" />
                            Düzenle
                          </Link>
                        </Button>
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
