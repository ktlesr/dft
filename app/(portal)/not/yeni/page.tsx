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

  if (!user.groupId) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Not Ekle" breadcrumbs={[{ label: "Notlar" }]} />
        <EmptyState icon={Users} title="Bir calisma grubuna atanmadiniz" />
      </div>
    );
  }

  const roleAllowedKinds: NoteKind[] = [];
  if (isAdmin || hasAdvisor) roleAllowedKinds.push("ADVISOR_NOTE");
  if (isAdmin || hasKs) roleAllowedKinds.push("KS_NOTE");
  if (roleAllowedKinds.length === 0) redirect("/yetkisiz");

  const requestedKind: NoteKind | null =
    kind === "ADVISOR_NOTE" || kind === "KS_NOTE" ? kind : null;
  if (requestedKind && !roleAllowedKinds.includes(requestedKind)) {
    redirect("/yetkisiz");
  }

  const allowedKinds: NoteKind[] = requestedKind ? [requestedKind] : roleAllowedKinds;
  const defaultKind = allowedKinds[0]!;
  const modeDescription =
    requestedKind === "ADVISOR_NOTE"
      ? "Danisman Notu olusturabilirsiniz."
      : requestedKind === "KS_NOTE"
        ? "Kalite Sistemi Notu olusturabilirsiniz."
        : allowedKinds.length > 1
          ? "Danisman Notu veya Kalite Sistemi Notu olusturabilirsiniz."
          : allowedKinds[0] === "ADVISOR_NOTE"
            ? "Danisman Notu olusturabilirsiniz."
            : "Kalite Sistemi Notu olusturabilirsiniz.";
  const pageTitle =
    requestedKind === "ADVISOR_NOTE"
      ? "Danisman Notu Ekle"
      : requestedKind === "KS_NOTE"
        ? "KS Yonetici Notu Ekle"
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
          Olusturdugunuz notlar calisma grubunuzda <strong>Danisman / KS Notlari</strong> sekmesinde gorunur.
        </AlertDescription>
      </Alert>

      <GroupNoteForm allowedKinds={allowedKinds} defaultKind={defaultKind} />
    </div>
  );
}