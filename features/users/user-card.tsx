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
  groups?: { code: string; description: string | null }[] | null;
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
  variant?: "admin" | "member";
  topLeftSlot?: React.ReactNode;
  actions?: React.ReactNode;
  selected?: boolean;
};

const STATUS_VARIANT: Record<UserStatus, "success" | "warning" | "muted"> = {
  ACTIVE: "success",
  PENDING_APPROVAL: "warning",
  SUSPENDED: "muted",
  REJECTED: "muted",
};

const ROLE_ORDER: Role[] = ["USER", "ADVISOR", "KS", "MODERATOR", "RAPPORTEUR", "ADMIN"];

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
  const position = user.profile?.position?.trim() ?? "";
  const organization = user.profile?.organization?.trim() ?? "";
  const roleSet = new Set<Role>(["USER", ...user.roles.map((r) => r.role)]);
  const visibleRoles = Array.from(roleSet).sort(
    (a, b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b),
  );
  const visibleGroups =
    user.groups && user.groups.length > 0
      ? user.groups
      : user.group
        ? [user.group]
        : [];
  const expertise = user.profile?.expertise ?? [];

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md",
        selected && "ring-2 ring-primary/60",
      )}
    >
      {topLeftSlot ? (
        <div className="absolute left-3 top-3 z-10">{topLeftSlot}</div>
      ) : null}

      {variant === "admin" && user.status ? (
        <div className="absolute right-3 top-3 z-10">
          <Badge variant={STATUS_VARIANT[user.status]}>
            {USER_STATUS_LABELS[user.status]}
          </Badge>
        </div>
      ) : null}

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

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <Link
            href={`/yonetim/kullanicilar/${user.id}`}
            className="block truncate text-base font-semibold leading-tight hover:text-primary"
            title={titledName}
          >
            {titledName}
          </Link>
          {position ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={position}>
              {position}
            </p>
          ) : null}
          {organization ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={organization}>
              {organization}
            </p>
          ) : null}
        </div>

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

        {visibleRoles.length > 0 || visibleGroups.length > 0 ? (
          <div className="space-y-1.5">
            {visibleGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {visibleGroups.map((g) => (
                  <Badge key={g.code} variant="success" className="text-[10px]">
                    {g.code}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-1">
              {visibleRoles.map((role) => (
                <Badge
                  key={role}
                  variant={role === "USER" ? "outline" : "secondary"}
                  className={cn("text-[10px]", role === "USER" && "border-primary/30 bg-primary/5 text-primary")}
                >
                  {ROLE_LABELS[role]}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

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

        {variant === "admin" && user.createdAt ? (
          <p className="mt-auto text-[11px] text-muted-foreground">
            Üyelik: {formatDate(user.createdAt)}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex items-center justify-end gap-1 border-t bg-muted/20 px-3 py-2">
          {actions}
        </div>
      ) : null}
    </Card>
  );
}
