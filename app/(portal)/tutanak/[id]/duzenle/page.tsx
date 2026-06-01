import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateMinute } from "@/features/minute/actions";
import { MinuteForm } from "@/features/minute/minute-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";

export const metadata = { title: "Tutanak Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditMinutePage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const minute = await prisma.meetingMinute.findUnique({
    where: { id },
    include: { meeting: { select: { id: true, groupId: true } } },
  });
  if (!minute || minute.deletedAt || !minute.meeting) notFound();
  if (!isAdmin(user) && (minute.authorId !== user.id || minute.meeting.groupId !== user.groupId)) {
    await redirectUnauthorized();
  }

  const meetings = await prisma.meeting.findMany({
    where: {
      deletedAt: null,
      ...(isAdmin(user) ? {} : { groupId: minute.meeting.groupId }),
    },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true, startAt: true },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Tutanak Düzenle"
        breadcrumbs={[
          { label: "Toplantı", href: `/toplanti/${minute.meeting.id}` },
          { label: "Tutanak Düzenle" },
        ]}
      />
      <MinuteForm
        meetings={meetings}
        action={updateMinute.bind(null, id)}
        cancelHref={`/toplanti/${minute.meeting.id}`}
        submitLabel="Tutanağı güncelle"
        defaults={{
          meetingId: minute.meetingId,
          date: minute.date.toISOString().slice(0, 10),
          attendees: minute.attendees,
          topics: minute.topics,
          decisions: minute.decisions,
          summary: minute.summary,
        }}
      />
    </div>
  );
}
