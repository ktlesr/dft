import Link from "next/link";
import { Building2, Mail, MapPin, Phone } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { avatarUrl, cn, formatDate, initials } from "@/lib/utils";
import type { Role, UserStatus } from "@prisma/client";

export type UserCardData = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  status?: UserStatus;
  createdAt?: Date;
  roles: { role: Role }[];
  group?: { code: string; description: string | null } | null;
  profile?: {
    title: string | null;
    position: string | null;
    organization: string | null;
    phone: string | null;
    city: string | null;
    expertise: string[];
  } | null;
};

type UserCardProps = {
  user: UserCardData;
  /** "admin" → status + üyelik tarihi + aksiyonlar. "member" → sade. */
  variant?: "admin" | "member";
  /** Üst köşe slot'u — admin'de toplu seçim checkbox'ı için. */
  topLeftSlot?: React.ReactNode;
  /** Alt aksiyon barı — admin'de Onayla/Reddet/Detay/Sil. */
  actions?: React.ReactNode;
  /** Kart kendisi seçili durumdaysa hafif vurgu. */
  selected?: boolean;
};

const STATUS_VARIANT: Record<UserStatus, "success" | "warning" | "muted"> = {
  ACTIVE: "success",
  PENDING_APPROVAL: "warning",
  SUSPENDED: "muted",
  REJECTED: "muted",
};

export function UserCard({
  user,
  variant = "member",
  topLeftSlot,
  actions,
  selected = false,
}: UserCardProps) {
  const displayName = user.name ?? user.email;
  const titledName = user.profile?.title
    ? `${user.profile.title} ${displayName}`
    : displayName;
  const positionLine = [user.profile?.position, user.profile?.organization]
    .filter(Boolean)
    .join(" · ");
  const visibleRoles = user.roles.filter((r) => r.role !== "USER");
  const expertise = user.profile?.expertise ?? [];

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md",
        selected && "ring-2 ring-primary/60",
      )}
    >
      {/* Üst köşe slot'u — checkbox vs. */}
      {topLeftSlot ? (
        <div className="absolute left-3 top-3 z-10">{topLeftSlot}</div>
      ) : null}

      {/* Status badge sağ üstte (admin) */}
      {variant === "admin" && user.status ? (
        <div className="absolute right-3 top-3 z-10">
          <Badge variant={STATUS_VARIANT[user.status]}>
            {USER_STATUS_LABELS[user.status]}
          </Badge>
        </div>
      ) : null}

      {/* Üst banner — büyük kare profil fotoğrafı */}
      <div className="flex items-center justify-center bg-gradient-to-b from-muted/40 to-muted/10 p-5">
        <Avatar className="h-32 w-32 rounded-lg shadow-sm ring-4 ring-background sm:h-36 sm:w-36">
          {user.image ? (
            <AvatarImage
              src={avatarUrl(user.id, user.image)}
              alt={displayName}
              className="rounded-lg object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-lg text-2xl font-semibold">
            {initials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Gövde — ad, pozisyon, kurum, iletişim */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <Link
            href={`/yonetim/kullanicilar/${user.id}`}
            className="block truncate text-base font-semibold leading-tight hover:text-primary"
            title={titledName}
          >
            {titledName}
          </Link>
          {positionLine ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={positionLine}>
              {positionLine}
            </p>
          ) : null}
        </div>

        {/* İletişim satırı */}
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <a
              href={`mailto:${user.email}`}
              className="truncate hover:text-foreground"
              title={user.email}
            >
              {user.email}
            </a>
          </li>
          {user.profile?.phone ? (
            <li className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a
                href={`tel:${user.profile.phone}`}
                className="truncate hover:text-foreground"
              >
                {user.profile.phone}
              </a>
            </li>
          ) : null}
          {user.profile?.city ? (
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.profile.city}</span>
            </li>
          ) : null}
          {!user.profile?.organization && user.group?.description ? (
            <li className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user.group.description}</span>
            </li>
          ) : null}
        </ul>

        {/* Rol + grup badge'leri */}
        {(visibleRoles.length > 0 || user.group?.code) ? (
          <div className="flex flex-wrap gap-1">
            {user.group?.code ? (
              <Badge variant="outline" className="text-[10px]">
                {user.group.code}
              </Badge>
            ) : null}
            {visibleRoles.map((r) => (
              <Badge key={r.role} variant="secondary" className="text-[10px]">
                {ROLE_LABELS[r.role]}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Uzmanlık alanları */}
        {expertise.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {expertise.slice(0, 6).map((tag) => (
              <Badge key={tag} variant="outline" className="font-normal text-[10px]">
                #{tag}
              </Badge>
            ))}
            {expertise.length > 6 ? (
              <Badge variant="outline" className="font-normal text-[10px]">
                +{expertise.length - 6}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {/* Üyelik tarihi (admin) */}
        {variant === "admin" && user.createdAt ? (
          <p className="mt-auto text-[11px] text-muted-foreground">
            Üyelik: {formatDate(user.createdAt)}
          </p>
        ) : null}
      </div>

      {/* Aksiyon barı */}
      {actions ? (
        <div className="flex items-center justify-end gap-1 border-t bg-muted/20 px-3 py-2">
          {actions}
        </div>
      ) : null}
    </Card>
  );
}
