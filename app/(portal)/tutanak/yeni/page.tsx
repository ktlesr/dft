import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { MinuteForm } from "@/features/minute/minute-form";
import { requireActiveUser } from "@/lib/current-user";
import { canCreateMinute } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Toplantı Tutanağı Ekle" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ toplanti?: string }>;

export default async function NewMinutePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { toplanti } = await searchParams;

  if (!user.groupId) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Toplantı Tutanağı Ekle" breadcrumbs={[{ label: "Tutanak" }]} />
        <EmptyState icon={Users} title="Bir çalışma grubuna atanmadınız" />
      </div>
    );
  }
  if (!canCreateMinute(user, user.groupId)) redirect("/yetkisiz");

  const meetings = await prisma.meeting.findMany({
    where: { groupId: user.groupId, deletedAt: null },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true, startAt: true },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Toplantı Tutanağı Ekle"
        description="Grubunuzun bir toplantısına bağlı tutanak oluşturun."
        breadcrumbs={[{ label: "Tutanak" }]}
      />
      <MinuteForm meetings={meetings} defaultMeetingId={toplanti} />
    </div>
  );
}
