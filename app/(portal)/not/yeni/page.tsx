import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GroupNoteForm } from "@/features/group-notes/note-form";
import { requireActiveUser } from "@/lib/current-user";
import { GROUP_NOTE_KIND_LABELS } from "@/lib/constants";

export const metadata = { title: "Not Ekle" };
export const dynamic = "force-dynamic";

type NoteKind = keyof typeof GROUP_NOTE_KIND_LABELS;

export default async function NewGroupNotePage() {
  const user = await requireActiveUser();
  const hasAdvisor = user.roles.includes("ADVISOR");
  const hasKs = user.roles.includes("KS");
  const isAdmin = user.roles.includes("ADMIN");

  if (!user.groupId) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Not Ekle" breadcrumbs={[{ label: "Notlar" }]} />
        <EmptyState icon={Users} title="Bir çalışma grubuna atanmadınız" />
      </div>
    );
  }

  const allowedKinds: NoteKind[] = [];
  if (isAdmin || hasAdvisor) allowedKinds.push("ADVISOR_NOTE");
  if (isAdmin || hasKs) allowedKinds.push("KS_NOTE");
  if (allowedKinds.length === 0) redirect("/yetkisiz");

  const defaultKind = allowedKinds[0]!;
  const modeDescription =
    allowedKinds.length > 1
      ? "Danışman Notu veya Kalite Sistemi Notu oluşturabilirsiniz."
      : allowedKinds[0] === "ADVISOR_NOTE"
        ? "Danışman Notu oluşturabilirsiniz."
        : "Kalite Sistemi Notu oluşturabilirsiniz.";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Not Ekle"
        description={modeDescription}
        breadcrumbs={[{ label: "Notlar" }]}
      />

      <Alert className="mb-4">
        <AlertDescription>
          Oluşturduğunuz notlar çalışma grubunuzda <strong>Danışman / KS Notları</strong> sekmesinde görünür.
        </AlertDescription>
      </Alert>

      <GroupNoteForm allowedKinds={allowedKinds} defaultKind={defaultKind} />
    </div>
  );
}
