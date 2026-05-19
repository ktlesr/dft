import { redirect } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { MeetingForm } from "@/features/meeting/meeting-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { canCreateMeeting } from "@/lib/rbac";
import { Users } from "lucide-react";

export const metadata = { title: "Toplantı Bildirimi Ekle" };
export const dynamic = "force-dynamic";

export default async function NewMeetingPage() {
  const user = await requireActiveUser();
  if (!user.groupId) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Toplantı Bildirimi Ekle" breadcrumbs={[{ label: "Toplantı Bildirimi" }]} />
        <EmptyState
          icon={Users}
          title="Bir çalışma grubuna atanmadınız"
          description="Yöneticiniz grubu atadıktan sonra toplantı bildirimi oluşturabilirsiniz."
        />
      </div>
    );
  }
  if (!canCreateMeeting(user, user.groupId)) await redirectUnauthorized();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Toplantı Bildirimi Ekle"
        description={`${user.groupCode ?? "Grup"}${user.groupDescription ? ` · ${user.groupDescription}` : ""}`}
        breadcrumbs={[{ label: "Toplantı Bildirimi" }]}
      />
      <MeetingForm />
    </div>
  );
}
