import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateGroupNote } from "@/features/group-notes/actions";
import { GroupNoteForm } from "@/features/group-notes/note-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { GROUP_NOTE_KIND_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Not Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type NoteKind = keyof typeof GROUP_NOTE_KIND_LABELS;

export default async function EditGroupNotePage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const note = await prisma.groupNote.findUnique({ where: { id } });
  if (!note || note.deletedAt) notFound();
  const admin = user.roles.includes("ADMIN");
  if (!admin && note.authorId !== user.id) await redirectUnauthorized();

  const hasAdvisor = user.roles.includes("ADVISOR");
  const hasKs = user.roles.includes("KS");
  const isAdvisorOrAdmin = admin || hasAdvisor;
  const allowedKinds: NoteKind[] = [];
  if (admin || hasAdvisor) allowedKinds.push("ADVISOR_NOTE");
  if (admin || hasKs) allowedKinds.push("KS_NOTE");
  if (!allowedKinds.includes(note.kind)) await redirectUnauthorized();

  const groups = isAdvisorOrAdmin
    ? await prisma.group.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Not Düzenle"
        breadcrumbs={[
          { label: "Notlar", href: "/calisma-grubum?tab=notlar" },
          { label: "Düzenle" },
        ]}
      />
      <GroupNoteForm
        allowedKinds={allowedKinds}
        defaultKind={note.kind}
        isAdvisorOrAdmin={isAdvisorOrAdmin}
        groups={groups}
        defaultGroupId={note.groupId}
        action={updateGroupNote.bind(null, id)}
        submitLabel="Notu güncelle"
        defaults={{
          kind: note.kind,
          title: note.title,
          body: note.body,
          scope: note.scope,
          groupId: note.groupId,
        }}
      />
    </div>
  );
}
