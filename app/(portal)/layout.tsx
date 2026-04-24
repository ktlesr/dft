import { redirect } from "next/navigation";

import { Header } from "@/components/app/header";
import { Sidebar } from "@/components/app/sidebar";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  if (user.status === "PENDING_APPROVAL") redirect("/onay-bekleniyor");
  if (user.status === "SUSPENDED" || user.status === "REJECTED") redirect("/yetkisiz");

  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });

  const headerUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    roles: user.roles,
    groupCode: user.groupCode,
  };

  const sidebarUser = {
    name: user.name,
    email: user.email,
    roles: user.roles,
    groupCode: user.groupCode,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar user={sidebarUser} className="hidden md:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={headerUser} unreadNotifications={unreadNotifications} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
