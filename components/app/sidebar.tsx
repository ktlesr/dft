"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLockup } from "@/components/brand/logo";
import { filterNavForRoles, NAV_GROUPS, type NavItem } from "@/components/app/nav-config";
import { Badge } from "@/components/ui/badge";
import { groupBadgeClass } from "@/lib/group-badge";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

type SidebarProps = {
  user: {
    name: string | null;
    email: string;
    roles: Role[];
    groupCode: string | null;
    groupDescription: string | null;
  } | null;
  className?: string;
};

const DFT_ADMIN_EMAIL = "admin@dft.ktlsr.com";

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  if (item.href === "/kayit/yeni") return pathname === "/kayit/yeni";
  if (item.href === "/kayitlarim") return pathname.startsWith("/kayitlarim");
  if (item.href === "/kpi/yeni") return pathname === "/kpi" || pathname === "/kpi/yeni";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function Sidebar({ user, className }: SidebarProps) {
  const pathname = usePathname();
  const roles = user?.roles ?? ["USER" as Role];
  const groups = user ? filterNavForRoles(roles) : NAV_GROUPS;
  const isDftSuperAdmin = user?.email.toLowerCase() === DFT_ADMIN_EMAIL;

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-border/60 bg-gradient-to-b from-card via-card to-secondary/50 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex h-16 items-center border-b px-4">
        <Link href={user ? "/panel" : "/"} aria-label="DFT Portal ana sayfa">
          <BrandLockup />
        </Link>
      </div>

      {isDftSuperAdmin ? (
        <div className="border-b px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Yetki Düzeyi
            </span>
            <Badge variant="success" className="font-medium">
              Süper Admin
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">Sistem Yöneticisi</p>
        </div>
      ) : user?.groupCode ? (
        <div className="border-b px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Çalışma Grubu
            </span>
            <Badge variant="outline" className={groupBadgeClass(user.groupCode)}>
              {user.groupCode}
            </Badge>
          </div>
          {user.groupDescription ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user.groupDescription}
            </p>
          ) : null}
        </div>
      ) : null}

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-5">
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-gradient-to-b before:from-[#0060ab] before:to-[#00bd8d]"
                          : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t px-5 py-3">
        <p className="text-[10px] text-muted-foreground">DFT Projesi Portalı · v0.1</p>
      </div>
    </aside>
  );
}
