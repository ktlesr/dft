import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAdmin } from "@/lib/current-user";
import { groupBadgeClass } from "@/lib/group-badge";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { avatarUrl, formatDateTime, initials } from "@/lib/utils";
import {
  addRole,
  approveUser,
  rejectUser,
  removeRole,
  suspendUser,
} from "@/features/admin/user-actions";
import { DeleteUserButton } from "@/features/admin/delete-user-button";
import { UserEditForm } from "@/features/admin/user-edit-form";
import { UserGroupForm } from "@/features/admin/user-group-form";
import { ProfilePhotoUploader, CvUploader } from "@/features/profile/media-forms";
import { AdminPanelNav } from "@/components/app/admin-nav";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ olusturuldu?: string; hata?: string }>;

const ALL_ROLES: Role[] = ["USER", "MODERATOR", "RAPPORTEUR", "ADVISOR", "KS", "ADMIN"];
const DFT_ADMIN_EMAIL = "admin@dft.ktlsr.com";

export default async function AdminUserDetail({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justCreated = sp.olusturuldu === "1";
  const deleteError =
    sp.hata === "kendi-silinemez"
      ? "Kendi hesabınızı silemezsiniz."
      : sp.hata === "son-admin"
        ? "Son yönetici hesabını silemezsiniz; önce başka birini ADMIN yapın."
        : null;
  const admin = await requireAdmin();

  const [user, allGroups] = await Promise.all([
    prisma.user.findUnique({
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
    }),
    prisma.group.findMany({
      orderBy: { code: "asc" },
      select: { code: true, description: true },
    }),
  ]);
  if (!user) notFound();

  const userRoles = user.roles.map((r) => r.role);
  const isDftAdminUser = user.email.toLowerCase() === DFT_ADMIN_EMAIL;
  const isSelf = user.id === admin.id;
  const adminCount = await prisma.roleAssignment.count({ where: { role: "ADMIN" } });
  const canRemoveAdmin = adminCount > 1;

  return (
    <div className="mx-auto max-w-7xl">
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

      {justCreated ? (
        <div className="mb-6 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span className="font-medium">Kullanıcı oluşturuldu.</span>{" "}
          <span className="text-muted-foreground">
            E-posta ve geçici şifreyi kullanıcıya güvenli bir kanaldan iletin. İlk girişte
            Profil → Güvenlik sekmesinden şifreyi değiştirebilir.
          </span>
        </div>
      ) : null}

      {deleteError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start gap-5">
              <Avatar className="h-32 w-32 rounded-lg shadow-sm ring-4 ring-background sm:h-36 sm:w-36">
                {user.image ? (
                  <AvatarImage
                    src={avatarUrl(user.id, user.image)}
                    alt={user.name ?? user.email}
                    className="rounded-lg object-cover"
                  />
                ) : null}
                <AvatarFallback className="rounded-lg text-2xl font-semibold">
                  {initials(user.name, user.email)}
                </AvatarFallback>
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
                  {isDftAdminUser ? (
                    <>
                      <Badge variant="success">Süper Admin</Badge>
                      <Badge variant="secondary">Sistem Yöneticisi</Badge>
                    </>
                  ) : user.group?.code ? (
                    <Badge variant="outline" className={groupBadgeClass(user.group.code)}>
                      {user.group.code}
                    </Badge>
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

          {!isDftAdminUser ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Çalışma grubu</CardTitle>
              </CardHeader>
              <CardContent>
                <UserGroupForm
                  userId={user.id}
                  defaultCode={user.group?.code ?? null}
                  groups={allGroups}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fotoğraf</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfilePhotoUploader
                targetUserId={user.id}
                currentPhotoUrl={user.image ? `/api/profil/foto/${user.id}?v=${encodeURIComponent(user.image)}` : null}
                fallback={initials(user.name, user.email)}
              />
            </CardContent>
          </Card>

          {!isDftAdminUser ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Özgeçmiş (CV)</CardTitle>
              </CardHeader>
              <CardContent>
                <CvUploader
                  targetUserId={user.id}
                  hasCv={!!user.profile?.cvStorageKey}
                  cvOriginalName={user.profile?.cvOriginalName ?? null}
                  viewerIsSelf
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Bilgi düzenleme — full-width altında */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Kullanıcı bilgilerini düzenle</CardTitle>
        </CardHeader>
        <CardContent>
          <UserEditForm
            defaults={{
              userId: user.id,
              name: user.name ?? "",
              organization: user.profile?.organization ?? "",
              academicTitle: user.profile?.title ?? "",
              position: user.profile?.position ?? "",
              city: user.profile?.city ?? "",
              phone: user.profile?.phone ?? "",
              bio: user.profile?.bio ?? "",
            }}
          />
        </CardContent>
      </Card>

      {/* Tehlikeli işlemler — silme */}
      {!isSelf ? (
        <Card className="mt-6 border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Tehlikeli işlemler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hesabı silmek bu üyenin profilini, atadığı rollerini ve sahip olduğu tüm
              kayıtları (proje, etkinlik, pano paylaşımları, toplantılar, tutanaklar,
              raporlar, paydaşlar, dijital içerikler vb.) <strong>kalıcı olarak</strong>{" "}
              kaldırır. Geri alınamaz.
            </p>
            <DeleteUserButton userId={user.id} userName={user.name ?? user.email} />
          </CardContent>
        </Card>
      ) : null}
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
