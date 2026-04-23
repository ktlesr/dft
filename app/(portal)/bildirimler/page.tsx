import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { markAllRead, markOneRead } from "@/features/notifications/actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bildirimler" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireActiveUser();

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Bildirimler"
        description="Grup toplantıları, raporlar, hesap onayları ve diğer sistem olayları."
        breadcrumbs={[{ label: "Bildirimler" }]}
        actions={
          unreadCount > 0 ? (
            <form action={markAllRead}>
              <Button type="submit" variant="secondary">
                <CheckCheck className="h-4 w-4" />
                Tümünü okundu işaretle
              </Button>
            </form>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Henüz bildirim yok"
          description="Yeni toplantı, rapor veya onay olduğunda burada görürsünüz."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4 transition-colors",
                    !n.readAt && "bg-primary/[0.03]",
                  )}
                >
                  <div className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    !n.readAt ? "bg-primary" : "bg-muted",
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      {n.link ? (
                        <Link href={n.link} className="truncate text-sm font-medium hover:text-primary">
                          {n.title}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium">{n.title}</p>
                      )}
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    {n.body ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    ) : null}
                  </div>
                  {!n.readAt ? (
                    <form action={markOneRead}>
                      <input type="hidden" name="id" value={n.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Okundu
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
