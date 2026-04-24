import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { GroupForm } from "@/features/admin/group-form";
import { GroupDeleteButton } from "@/features/admin/group-delete-button";

export const metadata = { title: "Grubu düzenle · Yönetim" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditGroupPage({ params }: { params: Params }) {
  const { id } = await params;
  await requireAdmin();

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: { where: { status: "ACTIVE" } },
        },
      },
    },
  });
  if (!group) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Grubu düzenle · ${group.code}`}
        description="Kod, ad veya açıklamayı güncelleyin. Kod değişirse üyelerde görünen kod da güncellenir."
        breadcrumbs={[
          { label: "Yönetim", href: "/yonetim" },
          { label: "Gruplar", href: "/yonetim/gruplar" },
          { label: group.code },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link href="/yonetim/gruplar">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
          </Button>
        }
      />
      <AdminPanelNav />

      <Card className="mb-6">
        <CardContent className="p-6">
          <GroupForm
            mode="update"
            defaults={{
              id: group.id,
              code: group.code,
              name: group.name,
              description: group.description ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Tehlikeli bölge</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm">Bu grubu tamamen sil.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {group._count.users > 0
                ? `${group._count.users} üye gruptan çıkarılır (başka gruba otomatik atanmaz).`
                : "Grupta aktif üye yok."}
            </p>
          </div>
          <GroupDeleteButton id={group.id} code={group.code} userCount={group._count.users} />
        </CardContent>
      </Card>
    </div>
  );
}
