import {
  LayoutDashboard,
  Newspaper,
  PlusCircle,
  FileText,
  Users,
  FolderOpen,
  User,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Settings2,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  roles?: Role[]; // if undefined → visible to every authenticated user
  exact?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ana menü",
    items: [
      { href: "/panel", label: "Ana Panel", icon: LayoutDashboard, exact: true },
      { href: "/panolar", label: "Panolar", icon: Newspaper },
      { href: "/kayit/yeni", label: "Yeni Kayıt Ekle", icon: PlusCircle },
      { href: "/kayitlarim", label: "Kayıtlarım", icon: FileText },
      { href: "/calisma-grubum", label: "Çalışma Grubum", icon: Users },
      { href: "/belgeler", label: "Belgeler", icon: FolderOpen },
      { href: "/profilim", label: "Profilim", icon: User },
    ],
  },
  {
    label: "Grup işlemleri",
    items: [
      {
        href: "/toplanti-bildirimi/yeni",
        label: "Toplantı Bildirimi Ekle",
        icon: CalendarDays,
        roles: ["MODERATOR", "ADMIN"],
      },
      {
        href: "/tutanak/yeni",
        label: "Toplantı Tutanağı Ekle",
        icon: ClipboardList,
        roles: ["RAPPORTEUR", "ADMIN"],
      },
      {
        href: "/rapor/yeni",
        label: "Rapor Ekle",
        icon: FileSpreadsheet,
        roles: ["RAPPORTEUR", "ADMIN"],
      },
    ],
  },
  {
    label: "Yönetim",
    items: [
      {
        href: "/yonetim",
        label: "Yönetim Paneli",
        icon: Settings2,
        roles: ["ADMIN"],
      },
    ],
  },
];

export function filterNavForRoles(roles: Role[]) {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r))),
  })).filter((g) => g.items.length > 0);
}
