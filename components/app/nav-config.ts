import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  FileText,
  Users,
  User,
  CalendarDays,
  FileSpreadsheet,
  MessageSquarePlus,
  NotebookPen,
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
      { href: "/dft-hakkinda", label: "DFT Hakkında", icon: Building2 },
      { href: "/kayit/yeni", label: "Yeni Kayıt Ekle", icon: PlusCircle },
      { href: "/kayitlarim", label: "Paylaşımlar", icon: FileText },
      { href: "/calisma-grubum", label: "Çalışma Grubum", icon: Users },
      { href: "/profilim", label: "Profilim", icon: User },
    ],
  },
  {
    label: "Grup işlemleri",
    items: [
      {
        // Tüm aktif üyeler tartışma başlatabilir; rol kısıtı yok.
        href: "/forum/yeni",
        label: "Konu/Tartışma Başlat",
        icon: MessageSquarePlus,
      },
      {
        href: "/bildirim/yeni",
        label: "Bildirim Ekle",
        icon: CalendarDays,
        roles: ["MODERATOR", "ADMIN"],
      },
      {
        href: "/rapor/yeni",
        label: "Rapor Ekle",
        icon: FileSpreadsheet,
        roles: ["RAPPORTEUR", "ADMIN"],
      },
      {
        href: "/not/yeni",
        label: "Not Ekle",
        icon: NotebookPen,
        roles: ["ADVISOR", "KS", "ADMIN"],
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
