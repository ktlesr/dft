import Link from "next/link";
import { Search, Upload, UserPlus } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { UsersTableClient } from "@/features/admin/users-table";
import type { Role, UserStatus } from "@prisma/client";

export const metadata = { title: "Kullanıcılar · Yönetim" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  durum?: string;
  q?: string;
  rol?: string;
  silindi?: string;
  hata?: string;
}>;

function isStatus(v?: string): v is UserStatus {
  return !!v && v in USER_STATUS_LABELS;
}

function isRole(v?: string): v is Role {
  return !!v && v in ROLE_LABELS;
}

const FILTER_ROLES: Role[] = ["USER", "MODERATOR", "RAPPORTEUR", "ADVISOR", "ADMIN"];

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const admin = await requireAdmin();
  const { durum, q, rol, silindi, hata } = await searchParams;
  const status = isStatus(durum) ? durum : undefined;
  const role = isRole(rol) ? rol : undefined;
  const silindiCount = silindi ? Number(silindi) : 0;
  const errorMessage =
    hata === "secim-yok"
      ? "Silinecek geçerli kullanıcı seçimi yok."
      : hata === "son-admin"
        ? "Seçim son yöneticiyi de içerdiği için bu hesap korunarak silinemedi."
        : null;

  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(role ? { roles: { some: { role } } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      roles: { select: { role: true } },
      group: { select: { code: true, description: true } },
      profile: {
        select: {
          title: true,
          position: true,
          organization: true,
          phone: true,
          city: true,
          expertise: true,
        },
      },
    },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-7xl">
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

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Durum
        </span>
        <StatusPill href={mkHref(undefined, q, role)} active={!status} label="Tümü" />
        {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((s) => (
          <StatusPill
            key={s}
            href={mkHref(s, q, role)}
            active={status === s}
            label={USER_STATUS_LABELS[s]}
          />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Rol
        </span>
        <StatusPill href={mkHref(status, q, undefined)} active={!role} label="Tümü" />
        {FILTER_ROLES.map((r) => (
          <StatusPill
            key={r}
            href={mkHref(status, q, r)}
            active={role === r}
            label={ROLE_LABELS[r]}
          />
        ))}
      </div>

      <form action="/yonetim/kullanicilar" className="mb-4 flex gap-2">
        {status ? <input type="hidden" name="durum" value={status} /> : null}
        {role ? <input type="hidden" name="rol" value={role} /> : null}
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Ad, e-posta veya kullanıcı adı…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href={mkHref(status, "", role)}>Temizle</Link>
          </Button>
        ) : null}
      </form>

      {silindiCount > 0 ? (
        <Alert className="mb-4">
          <AlertDescription>
            <strong>{silindiCount}</strong> kullanıcı kalıcı olarak silindi.
          </AlertDescription>
        </Alert>
      ) : null}
      {errorMessage ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {users.length === 0 ? (
        <EmptyState
          title={q || status || role ? "Sonuç bulunamadı" : "Kullanıcı yok"}
        />
      ) : (
        <UsersTableClient users={users} adminId={admin.id} />
      )}
    </div>
  );
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

function mkHref(
  status: UserStatus | undefined,
  q: string | undefined,
  role?: Role | undefined,
) {
  const p = new URLSearchParams();
  if (status) p.set("durum", status);
  if (role) p.set("rol", role);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/yonetim/kullanicilar?${qs}` : "/yonetim/kullanicilar";
}
