import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateMeeting } from "@/features/meeting/actions";
import { MeetingForm } from "@/features/meeting/meeting-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";

export const metadata = { title: "Toplantı Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function dateTimeLocal(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
}

export default async function EditMeetingPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const meeting = await prisma.meeting.findUnique({ where: { id } });
  if (!meeting || meeting.deletedAt) notFound();
  if (!isAdmin(user) && (meeting.createdById !== user.id || meeting.groupId !== user.groupId)) {
    await redirectUnauthorized();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Toplantı Düzenle"
        breadcrumbs={[
          { label: "Toplantı", href: `/toplanti/${id}` },
          { label: "Düzenle" },
        ]}
      />
      <MeetingForm
        action={updateMeeting.bind(null, id)}
        cancelHref={`/toplanti/${id}`}
        submitLabel="Toplantıyı güncelle"
        showPinToBoard={false}
        defaults={{
          title: meeting.title,
          startAt: dateTimeLocal(meeting.startAt),
          endAt: dateTimeLocal(meeting.endAt),
          location: meeting.location,
          onlineUrl: meeting.onlineUrl,
          description: meeting.description,
          agenda: meeting.agenda,
          pinToBoard: meeting.pinToBoard,
        }}
      />
    </div>
  );
}
