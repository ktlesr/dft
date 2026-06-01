import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateMeetingResult } from "@/features/meeting-result/actions";
import { MeetingResultForm } from "@/features/meeting-result/meeting-result-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";

export const metadata = { title: "Toplantı Sonucu Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function dateTimeLocal(value: Date): string {
  return value.toISOString().slice(0, 16);
}

export default async function EditMeetingResultPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  if (!isAdmin(user)) await redirectUnauthorized();
  const result = await prisma.meetingResult.findUnique({ where: { id } });
  if (!result || result.deletedAt) notFound();

  const groups = await prisma.group.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Toplantı Sonucu Düzenle"
        breadcrumbs={[
          { label: "Çalışma Grubum", href: "/calisma-grubum?tab=toplantilar" },
          { label: "Düzenle" },
        ]}
      />
      <MeetingResultForm
        groups={groups}
        action={updateMeetingResult.bind(null, id)}
        cancelHref="/calisma-grubum?tab=toplantilar"
        submitLabel="Toplantı sonucunu güncelle"
        defaults={{
          title: result.title,
          description: result.description,
          startAt: dateTimeLocal(result.startAt),
          endAt: dateTimeLocal(result.endAt),
          scope: result.scope as "GENEL" | "MRDK",
          mrdkTarget: result.mrdkTarget as "ALL" | "SPECIFIC" | null,
          targetGroupIds: result.targetGroupIds,
        }}
      />
    </div>
  );
}
