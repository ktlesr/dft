import Link from "next/link";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

/** Server component — shows unread count from DB. */
export async function NotificationsBell({ userId }: { userId: string }) {
  const unread = await prisma.notification.count({
    where: { userId, readAt: null },
  });

  return (
    <Button asChild variant="ghost" size="icon" className="relative" aria-label="Bildirimler">
      <Link href="/bildirimler">
        <Bell className="h-[1.1rem] w-[1.1rem]" />
        {unread > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 py-0 text-[10px] leading-none"
          >
            {unread > 9 ? "9+" : unread}
          </Badge>
        ) : null}
      </Link>
    </Button>
  );
}
