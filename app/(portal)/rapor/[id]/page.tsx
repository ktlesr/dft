import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Paperclip, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canSeeGroupResource, isAdmin } from "@/lib/rbac";
import { REPORT_KIND_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";
import { removeReport } from "@/features/report/actions";

export const dynamic = "force-dynamic";
type Params = Promise<{ id: string }>;

export default async function ReportDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();

  const report = await prisma.groupReport.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true } },
      group: { select: { code: true } },
      attachments: { select: { id: true, originalName: true, size: true } },
    },
  });
  if (!report || report.deletedAt) notFound();
  if (!canSeeGroupResource(user, report.groupId)) await redirectUnauthorized();

  const canRemove = isAdmin(user) || report.authorId === user.id;
  const removeAction = async () => {
    "use server";
    await removeReport(id);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={report.title}
        description={`${report.group?.code ?? ""} · ${REPORT_KIND_LABELS[report.kind]} · ${formatDateTime(report.createdAt)}`}
        breadcrumbs={[
          { label: "Çalışma Grubum", href: "/calisma-grubum" },
          { label: REPORT_KIND_LABELS[report.kind] },
        ]}
        actions={
          canRemove ? (
            <form action={removeAction}>
              <Button type="submit" variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Sil
              </Button>
            </form>
          ) : null
        }
      />

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{REPORT_KIND_LABELS[report.kind]}</Badge>
            {report.periodStart || report.periodEnd ? (
              <span className="text-xs text-muted-foreground">
                Dönem: {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">
              Yazan: {report.author.name ?? report.author.email}
            </span>
          </div>

          {report.summary ? (
            <>
              <Separator />
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Özet</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{report.summary}</p>
              </section>
            </>
          ) : null}

          {report.body ? (
            <>
              <Separator />
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rapor metni</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{report.body}</p>
              </section>
            </>
          ) : null}

          {report.outputs ? (
            <>
              <Separator />
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Çıktılar / öneriler</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{report.outputs}</p>
              </section>
            </>
          ) : null}

          {report.attachments.length > 0 ? (
            <>
              <Separator />
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ek dosyalar</p>
                <ul className="mt-2 space-y-1">
                  {report.attachments.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/api/dosya/${a.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {a.originalName}
                        <span className="text-muted-foreground">· {Math.round(a.size / 1024)} KB</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
