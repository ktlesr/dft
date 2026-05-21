import Link from "next/link";
import { Upload } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { AnnouncementRowActions } from "@/features/board/announcements-admin-row-actions";
import { AnnouncementsBulkDeleteButton } from "@/features/board/announcements-admin-bulk-delete";

export const metadata = { title: "Çağrı/Hibe Duyuruları · Yönetim" };
export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();

  const posts = await prisma.boardPost.findMany({
    where: {
      scope: "GENERAL",
      kind: "ANNOUNCEMENT",
      deletedAt: null,
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      scope: true,
      kind: true,
      title: true,
      body: true,
      assessment: true,
      tags: true,
      externalUrl: true,
      publishedAt: true,
      attachments: { select: { id: true, originalName: true } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Çağrı/Hibe Duyuruları"
        description="Tüm Çağrı/Hibe Duyurusu kayıtlarını listeler, düzenler veya siler."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "Duyurular" }]}
        actions={
          <Button asChild variant="secondary">
            <Link href="/panolar/genel/toplu?kategori=cagri-hibe-etkinlik">
              <Upload className="h-4 w-4" />
              Toplu yükle
            </Link>
          </Button>
        }
      />
      <AdminPanelNav />

      <Card>
        <CardContent className="p-0">
          {/* Tablo üstü meta + Hepsini sil */}
          <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Toplam <span className="font-medium text-foreground">{posts.length}</span> duyuru
            </p>
            <AnnouncementsBulkDeleteButton total={posts.length} />
          </div>

          {posts.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Henüz Çağrı/Hibe Duyurusu yok"
                description="Yeni duyuru eklemek için Genel Pano > Çağrı/Hibe Duyurusu kategorisinden ekleyin."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Başlık</th>
                    <th className="px-4 py-3 font-medium w-44">Son Başvuru Tarihi</th>
                    <th className="px-4 py-3 font-medium w-48 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {posts.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-foreground">{p.title}</p>
                      </td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {formatDate(p.publishedAt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <AnnouncementRowActions
                          post={{
                            id: p.id,
                            scope: p.scope as "GENERAL",
                            kind: p.kind,
                            title: p.title,
                            body: p.body,
                            assessment: p.assessment ?? null,
                            tags: p.tags,
                            externalUrl: p.externalUrl,
                            publishedAt: p.publishedAt,
                            attachments: p.attachments,
                          }}
                        />
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
