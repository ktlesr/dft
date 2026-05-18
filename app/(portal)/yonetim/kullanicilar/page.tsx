import Link from "next/link";
import { CheckCircle2, Search, Upload, UserPlus, XCircle } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { avatarUrl, formatDate, initials } from "@/lib/utils";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { approveUser, rejectUser } from "@/features/admin/user-actions";
import { DeleteUserButton } from "@/features/admin/delete-user-button";
import type { UserStatus } from "@prisma/client";

export const metadata = { title: "Kullanıcılar · Yönetim" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ durum?: string; q?: string }>;

function isStatus(v?: string): v is UserStatus {
  return !!v && v in USER_STATUS_LABELS;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const { durum, q } = await searchParams;
  const status = isStatus(durum) ? durum : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      roles: { select: { role: true } },
      group: { select: { code: true, description: true } },
    },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kullanıcılar"
        description="Portal üyelerini görüntüleyin, oluşturun ve rollerini / gruplarını yönetin."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "Kullanıcılar" }]}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="secondary">
              <Link href="/yonetim/kullanicilar/toplu">
                <Upload className="h-4 w-4" />
                Toplu içe aktar
              </Link>
            </Button>
            <Button asChild variant="brand">
              <Link href="/yonetim/kullanicilar/yeni">
                <UserPlus className="h-4 w-4" />
                Yeni kullanıcı
              </Link>
            </Button>
          </div>
        }
      />
      <AdminPanelNav />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill href={mkHref(undefined, q)} active={!status} label="Tümü" />
        {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((s) => (
          <StatusPill
            key={s}
            href={mkHref(s, q)}
            active={status === s}
            label={USER_STATUS_LABELS[s]}
          />
        ))}
      </div>

      <form action="/yonetim/kullanicilar" className="mb-4 flex gap-2">
        {status ? <input type="hidden" name="durum" value={status} /> : null}
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Ad veya e-posta…" className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href={mkHref(status, "")}>Temizle</Link>
          </Button>
        ) : null}
      </form>

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState
              title={q || status ? "Sonuç bulunamadı" : "Kullanıcı yok"}
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Kullanıcı</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Grup</th>
                    <th className="px-4 py-3 font-medium">Roller</th>
                    <th className="px-4 py-3 font-medium">Kaydoldu</th>
                    <th className="px-4 py-3 text-right font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {u.image ? (
                              <AvatarImage src={avatarUrl(u.id, u.image)} alt={u.name ?? u.email} />
                            ) : null}
                            <AvatarFallback>{initials(u.name, u.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              href={`/yonetim/kullanicilar/${u.id}`}
                              className="truncate font-medium hover:text-primary"
                            >
                              {u.name ?? u.email}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>
                      <td className="px-4 py-3">
                        {u.group?.code ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge variant="outline">{u.group.code}</Badge>
                            {u.group.description ? (
                              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                                {u.group.description}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles
                            .filter((r) => r.role !== "USER")
                            .map((r) => (
                              <Badge key={r.role} variant="secondary" className="text-[10px]">
                                {ROLE_LABELS[r.role]}
                              </Badge>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {u.status === "PENDING_APPROVAL" ? (
                            <>
                              <form action={approveUser}>
                                <input type="hidden" name="userId" value={u.id} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="accent"
                                  className="h-8 px-2"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Onayla
                                </Button>
                              </form>
                              <form action={rejectUser}>
                                <input type="hidden" name="userId" value={u.id} />
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reddet
                                </Button>
                              </form>
                            </>
                          ) : (
                            <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                              <Link href={`/yonetim/kullanicilar/${u.id}`}>Detay</Link>
                            </Button>
                          )}
                          {u.id !== admin.id ? (
                            <DeleteUserButton
                              userId={u.id}
                              userName={u.name ?? u.email}
                              compact
                            />
                          ) : null}
                        </div>
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

function StatusBadge({ status }: { status: UserStatus }) {
  const variant =
    status === "ACTIVE"
      ? "success"
      : status === "PENDING_APPROVAL"
        ? "warning"
        : "muted";
  return <Badge variant={variant as "success" | "warning" | "muted"}>{USER_STATUS_LABELS[status]}</Badge>;
}

function StatusPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {label}
    </Link>
  );
}

function mkHref(status: UserStatus | undefined, q: string | undefined) {
  const p = new URLSearchParams();
  if (status) p.set("durum", status);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/yonetim/kullanicilar?${qs}` : "/yonetim/kullanicilar";
}
