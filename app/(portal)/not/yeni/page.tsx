import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GroupNoteForm } from "@/features/group-notes/note-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { GROUP_NOTE_KIND_LABELS } from "@/lib/constants";

export const metadata = { title: "Not Ekle" };
export const dynamic = "force-dynamic";

type NoteKind = keyof typeof GROUP_NOTE_KIND_LABELS;
type NoteSearchParams = Promise<{ kind?: string }>;

export default async function NewGroupNotePage({
  searchParams,
}: {
  searchParams: NoteSearchParams;
}) {
  const user = await requireActiveUser();
  const { kind } = await searchParams;
  const hasAdvisor = user.roles.includes("ADVISOR");
  const hasKs = user.roles.includes("KS");
  const isAdmin = user.roles.includes("ADMIN");
  const isAdvisorOrAdmin = isAdmin || hasAdvisor;

  if (!user.groupId && !isAdvisorOrAdmin) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Not Ekle" breadcrumbs={[{ label: "Notlar" }]} />
        <EmptyState icon={Users} title="Bir çalışma grubuna atanmadınız" />
      </div>
    );
  }

  const groups = isAdvisorOrAdmin
    ? await prisma.group.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const roleAllowedKinds: NoteKind[] = [];
  if (isAdmin || hasAdvisor) roleAllowedKinds.push("ADVISOR_NOTE");
  if (isAdmin || hasKs) roleAllowedKinds.push("KS_NOTE");
  if (roleAllowedKinds.length === 0) await redirectUnauthorized();

  const requestedKind: NoteKind | null =
    kind === "ADVISOR_NOTE" || kind === "KS_NOTE" ? kind : null;
  if (requestedKind && !roleAllowedKinds.includes(requestedKind)) {
    await redirectUnauthorized();
  }

  const allowedKinds: NoteKind[] = requestedKind ? [requestedKind] : roleAllowedKinds;
  const defaultKind = allowedKinds[0]!;
  const modeDescription =
    requestedKind === "ADVISOR_NOTE"
      ? "Danışman Notu oluşturabilirsiniz."
      : requestedKind === "KS_NOTE"
        ? "Kalite Sorumlusu Notu oluşturabilirsiniz."
        : allowedKinds.length > 1
          ? "Danışman Notu veya Kalite Sorumlusu Notu oluşturabilirsiniz."
          : allowedKinds[0] === "ADVISOR_NOTE"
            ? "Danışman Notu oluşturabilirsiniz."
            : "Kalite Sorumlusu Notu oluşturabilirsiniz.";
  const pageTitle =
    requestedKind === "ADVISOR_NOTE"
      ? "Danışman Notu Ekle"
      : requestedKind === "KS_NOTE"
        ? "Kalite Sorumlusu Notu Ekle"
        : "Not Ekle";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={pageTitle}
        description={modeDescription}
        breadcrumbs={[{ label: "Notlar" }]}
      />

      <Alert className="mb-4">
        <AlertDescription>
          Oluşturduğunuz notlar çalışma grubunuzda <strong>Danışman / KS Notları</strong> sekmesinde görünür.
        </AlertDescription>
      </Alert>

      <GroupNoteForm
        allowedKinds={allowedKinds}
        defaultKind={defaultKind}
        isAdvisorOrAdmin={isAdvisorOrAdmin}
        groups={groups}
        defaultGroupId={user.groupId}
      />
    </div>
  );
}
