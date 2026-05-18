import Link from "next/link";
import { Pencil, PlusCircle } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { GroupDeleteButton } from "@/features/admin/group-delete-button";

export const metadata = { title: "Gruplar · Yönetim" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ olusturuldu?: string; silindi?: string }>;

export default async function AdminGroupsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  const groups = await prisma.group.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: {
          users: { where: { status: "ACTIVE" } },
          meetings: { where: { deletedAt: null } },
          reports: { where: { deletedAt: null } },
          boardPosts: { where: { deletedAt: null } },
          documents: { where: { deletedAt: null } },
        },
      },
      users: {
        where: { status: "ACTIVE" },
        include: { roles: { select: { role: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Çalışma grupları"
        description="Grup kodu, adı ve açıklamasını yönetin; yeni grup ekleyin veya kaldırın."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "Gruplar" }]}
        actions={
          <Button asChild variant="brand">
            <Link href="/yonetim/gruplar/yeni">
              <PlusCircle className="h-4 w-4" />
              Yeni grup
            </Link>
          </Button>
        }
      />
      <AdminPanelNav />

      {sp.olusturuldu ? (
        <div className="mb-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">
          <span className="font-mono font-medium">{sp.olusturuldu}</span> grubu oluşturuldu.
        </div>
      ) : null}
      {sp.silindi ? (
        <div className="mb-4 rounded-md border border-accent/40 bg-accent/10 px-4 py-2 text-sm">
          Grup silindi.
        </div>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          title="Henüz grup yok"
          description="İlk çalışma grubunu oluşturmak için sağ üstteki düğmeyi kullanın."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => {
            const moderators = g.users.filter((u) => u.roles.some((r) => r.role === "MODERATOR"));
            const rapporteurs = g.users.filter((u) => u.roles.some((r) => r.role === "RAPPORTEUR"));
            return (
              <Card key={g.id}>
                <CardContent className="space-y-3 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-mono text-lg font-semibold">{g.code}</h2>
                        <Badge variant="outline">{g._count.users} üye</Badge>
                      </div>
                      <p className="mt-0.5 text-sm font-medium">{g.name}</p>
                      {g.description ? (
                        <p className="text-xs text-muted-foreground">{g.description}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/yonetim/gruplar/${g.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                          Düzenle
                        </Link>
                      </Button>
                      <GroupDeleteButton
                        id={g.id}
                        code={g.code}
                        userCount={g._count.users}
                      />
                    </div>
                  </div>

                  <dl className="grid grid-cols-4 gap-2 rounded-md border p-3 text-center">
                    <Stat label="Toplantı" value={g._count.meetings} />
                    <Stat label="Rapor" value={g._count.reports} />
                    <Stat label="Pano" value={g._count.boardPosts} />
                    <Stat label="Belge" value={g._count.documents} />
                  </dl>

                  <div className="grid gap-2 text-xs">
                    <Row label="Moderatör(ler)">
                      {moderators.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {moderators.map((m) => (
                            <Link
                              key={m.id}
                              href={`/yonetim/kullanicilar/${m.id}`}
                              className="text-primary hover:underline"
                            >
                              {m.name ?? m.email}
                            </Link>
                          ))}
                        </div>
                      )}
                    </Row>
                    <Row label="Raportör(ler)">
                      {rapporteurs.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {rapporteurs.map((m) => (
                            <Link
                              key={m.id}
                              href={`/yonetim/kullanicilar/${m.id}`}
                              className="text-primary hover:underline"
                            >
                              {m.name ?? m.email}
                            </Link>
                          ))}
                        </div>
                      )}
                    </Row>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-2">
                    {g.users
                      .filter((u) => !u.roles.some((r) => r.role === "MODERATOR" || r.role === "RAPPORTEUR"))
                      .slice(0, 10)
                      .map((u) => (
                        <Link
                          key={u.id}
                          href={`/yonetim/kullanicilar/${u.id}`}
                          className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {u.name ?? u.email}
                        </Link>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="min-w-[112px] shrink-0 whitespace-nowrap pr-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
