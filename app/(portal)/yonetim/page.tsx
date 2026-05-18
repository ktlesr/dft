import Link from "next/link";
import {
  Clock,
  FileStack,
  MailPlus,
  Newspaper,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { AdminPanelNav } from "@/components/app/admin-nav";

export const metadata = { title: "Yönetim Paneli" };
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  await requireAdmin();

  const [pending, active, suspended, invitesOpen, boardPosts, documents] = await Promise.all([
    prisma.user.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { status: { in: ["SUSPENDED", "REJECTED"] } } }),
    prisma.invite.count({ where: { status: "PENDING" } }),
    prisma.boardPost.count({ where: { deletedAt: null, status: "PUBLISHED" } }),
    prisma.document.count({ where: { deletedAt: null } }),
  ]);

  const stats = [
    { label: "Onay bekleyen", value: pending, href: "/yonetim/kullanicilar?durum=PENDING_APPROVAL", icon: Clock, tone: "warning" as const },
    { label: "Aktif üye", value: active, href: "/yonetim/kullanicilar?durum=ACTIVE", icon: Users, tone: "primary" as const },
    { label: "Askıda / reddedilmiş", value: suspended, href: "/yonetim/kullanicilar?durum=SUSPENDED", icon: Users, tone: "muted" as const },
    { label: "Açık davet", value: invitesOpen, href: "/yonetim/davetler", icon: MailPlus, tone: "primary" as const },
    { label: "Pano paylaşımı", value: boardPosts, href: "/panolar", icon: Newspaper, tone: "muted" as const },
    { label: "Belge", value: documents, href: "/belgeler", icon: FileStack, tone: "muted" as const },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Yönetim Paneli"
        description="Kullanıcı onayları, davet yönetimi, rol atamaları ve audit takibi."
        breadcrumbs={[{ label: "Yönetim" }]}
      />
      <AdminPanelNav />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}>
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={
                      "flex h-11 w-11 items-center justify-center rounded-lg " +
                      (s.tone === "warning"
                        ? "bg-amber-500/10 text-amber-600"
                        : s.tone === "primary"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
