"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  FileArchive,
  Gauge,
  Megaphone,
  Settings2,
  Users,
  MailPlus,
  Users2,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AdminNavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Admin panel tab bar. Kept inside this client module (items + rendering)
 * so no non-serialisable function components cross the server/client boundary.
 */
const ITEMS: AdminNavItem[] = [
  { href: "/yonetim", label: "Genel", icon: Gauge },
  { href: "/yonetim/kullanicilar", label: "Kullanıcılar", icon: Users },
  { href: "/yonetim/davetler", label: "Davetler", icon: MailPlus },
  { href: "/yonetim/gruplar", label: "Gruplar", icon: Users2 },
  { href: "/yonetim/duyurular", label: "Duyurular", icon: Megaphone },
  { href: "/yonetim/dft-hakkinda", label: "DFT Hakkında", icon: Building2 },
  { href: "/yonetim/sablonlar", label: "Şablonlar", icon: FileArchive },
  { href: "/yonetim/ayarlar", label: "Ayarlar", icon: Settings2 },
  { href: "/yonetim/loglar", label: "Audit log", icon: ScrollText },
];

export function AdminPanelNav() {
  const pathname = usePathname();

  return (
    <nav className="scrollbar-thin mb-6 flex gap-1 overflow-x-auto border-b pb-1">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || (item.href !== "/yonetim" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
