import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, PauseCircle, XCircle } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
  GROUP_LABELS,
  ROLE_LABELS,
  USER_STATUS_LABELS,
} from "@/lib/constants";
import { formatDateTime, initials } from "@/lib/utils";
import {
  addRole,
  approveUser,
  changeUserGroup,
  rejectUser,
  removeRole,
  suspendUser,
} from "@/features/admin/user-actions";
import { AdminPanelNav } from "@/components/app/admin-nav";
import type { GroupCode, Role } from "@prisma/client";

export const dynamic = "force-dynamic";
type Params = Promise<{ id: string }>;

const ALL_ROLES: Role[] = ["USER", "MODERATOR", "RAPPORTEUR", "ADMIN"];
const GROUP_CODES: GroupCode[] = ["UAK", "E2SC", "DFSF", "PGD", "PA"];

export default async function AdminUserDetail({ params }: { params: Params }) {
  const { id } = await params;
  const admin = await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: true,
      group: true,
      profile: true,
      approvedBy: { select: { name: true, email: true } },
      _count: {
        select: {
          projectApps: { where: { deletedAt: null } },
          events: { where: { deletedAt: null } },
          boardPosts: { where: { deletedAt: null } },
          meetings: { where: { deletedAt: null } },
          minutes: { where: { deletedAt: null } },
          reports: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!user) notFound();

  const userRoles = user.roles.map((r) => r.role);
  const isSelf = user.id === admin.id;
  const adminCount = await prisma.roleAssignment.count({ where: { role: "ADMIN" } });
  const canRemoveAdmin = adminCount > 1;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={user.name ?? user.email}
        description={`Üye detayı · ${USER_STATUS_LABELS[user.status]}`}
        breadcrumbs={[
          { label: "Yönetim", href: "/yonetim" },
          { label: "Kullanıcılar", href: "/yonetim/kullanicilar" },
          { label: user.name ?? user.email },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link href="/yonetim/kullanicilar">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
          </Button>
        }
      />
      <AdminPanelNav />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                {user.image ? <AvatarImage src={user.image} alt={user.name ?? user.email} /> : null}
                <AvatarFallback className="text-lg">{initials(user.name, user.email)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{user.name ?? "—"}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant={user.status === "ACTIVE" ? "success" : user.status === "PENDING_APPROVAL" ? "warning" : "muted"}
                  >
                    {USER_STATUS_LABELS[user.status]}
                  </Badge>
                  {user.group?.code ? (
                    <Badge variant="outline">{user.group.code}</Badge>
                  ) : null}
                  {userRoles
                    .filter((r) => r !== "USER")
                    .map((r) => (
                      <Badge key={r} variant="secondary">
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
              <Info label="Kurum" value={user.profile?.organization ?? "—"} />
              <Info label="Telefon" value={user.profile?.phone ?? "—"} />
              <Info label="Görev" value={user.profile?.position ?? "—"} />
              <Info label="E-posta doğrulama" value={user.emailVerified ? formatDateTime(user.emailVerified) : "—"} />
              <Info label="Kaydoldu" value={formatDateTime(user.createdAt)} />
              <Info label="Son giriş" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"} />
              <Info
                label="Onaylayan"
                value={
                  user.approvedAt
                    ? `${user.approvedBy?.name ?? user.approvedBy?.email ?? "—"} · ${formatDateTime(user.approvedAt)}`
                    : "—"
                }
              />
              <Info
                label="Red nedeni"
                value={user.status === "REJECTED" ? user.rejectedReason ?? "—" : "—"}
              />
            </dl>

            {user.profile?.bio ? (
              <>
                <Separator className="my-6" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Özgeçmiş</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{user.profile.bio}</p>
              </>
            ) : null}

            <Separator className="my-6" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Katkı özeti</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Proje başvurusu" value={user._count.projectApps} />
              <Stat label="Etkinlik" value={user._count.events} />
              <Stat label="Pano paylaşımı" value={user._count.boardPosts} />
              <Stat label="Toplantı" value={user._count.meetings} />
              <Stat label="Tutanak" value={user._count.minutes} />
              <Stat label="Rapor" value={user._count.reports} />
            </div>
          </CardContent>
        </Card>

        {/* ADMIN ACTIONS */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Durum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {user.status === "PENDING_APPROVAL" ? (
                <>
                  <form action={approveUser}>
                    <input type="hidden" name="userId" value={user.id} />
                    <Button type="submit" variant="accent" className="w-full">
                      <CheckCircle2 className="h-4 w-4" />
                      Hesabı onayla
                    </Button>
                  </form>
                  <form action={rejectUser} className="space-y-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <textarea
                      name="reason"
                      placeholder="Red nedeni (opsiyonel)…"
                      maxLength={500}
                      className="flex min-h-[64px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button type="submit" variant="outline" className="w-full text-destructive hover:text-destructive">
                      <XCircle className="h-4 w-4" />
                      Başvuruyu reddet
                    </Button>
                  </form>
                </>
              ) : null}
              {user.status === "ACTIVE" && !isSelf ? (
                <form action={suspendUser}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="outline" className="w-full">
                    <PauseCircle className="h-4 w-4" />
                    Askıya al
                  </Button>
                </form>
              ) : null}
              {user.status === "SUSPENDED" || user.status === "REJECTED" ? (
                <form action={approveUser}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button type="submit" variant="accent" className="w-full">
                    <CheckCircle2 className="h-4 w-4" />
                    Tekrar aktifleştir
                  </Button>
                </form>
              ) : null}
              {isSelf ? (
                <p className="text-[11px] text-muted-foreground">
                  Kendi hesabınızda durum değişikliği yapamazsınız.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roller</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ALL_ROLES.map((role) => {
                const has = userRoles.includes(role);
                const disable =
                  (role === "ADMIN" && has && !canRemoveAdmin && isSelf) ||
                  (role === "USER" && has); // USER is the base role, keep it
                return (
                  <div key={role} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>{ROLE_LABELS[role]}</span>
                    {has ? (
                      <form action={removeRole}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="role" value={role} />
                        <Button type="submit" size="sm" variant="ghost" disabled={disable} className="h-7 px-2 text-destructive hover:text-destructive">
                          Kaldır
                        </Button>
                      </form>
                    ) : (
                      <form action={addRole}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="role" value={role} />
                        <Button type="submit" size="sm" variant="ghost" className="h-7 px-2">
                          Ekle
                        </Button>
                      </form>
                    )}
                  </div>
                );
              })}
              {!canRemoveAdmin && userRoles.includes("ADMIN") ? (
                <p className="text-[11px] text-muted-foreground">
                  Son yönetici — kaldırmadan önce başka birini ADMIN yapın.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Çalışma grubu</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={changeUserGroup} className="space-y-2">
                <input type="hidden" name="userId" value={user.id} />
                <select
                  name="groupCode"
                  defaultValue={user.group?.code ?? ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Grup atanmamış —</option>
                  {GROUP_CODES.map((c) => (
                    <option key={c} value={c}>
                      {c} · {GROUP_LABELS[c].description}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="brand" className="w-full">
                  Grubu güncelle
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
  );
}
