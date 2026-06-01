import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateDiscussion } from "@/features/forum/actions";
import { NewDiscussionForm } from "@/features/forum/new-discussion-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin, isModerator } from "@/lib/rbac";

export const metadata = { title: "Forum Konusu Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditDiscussionPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const discussion = await prisma.discussion.findUnique({ where: { id } });
  if (!discussion || discussion.deletedAt) notFound();
  const sameGroupMod = isModerator(user) && discussion.groupId === user.groupId;
  if (discussion.authorId !== user.id && !sameGroupMod && !isAdmin(user)) await redirectUnauthorized();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Forum Konusu Düzenle"
        breadcrumbs={[
          { label: "Forum", href: `/forum/${id}` },
          { label: "Düzenle" },
        ]}
      />
      <NewDiscussionForm
        canPin={isAdmin(user) || sameGroupMod}
        defaults={{ title: discussion.title, body: discussion.body, pinned: discussion.pinned }}
        action={updateDiscussion.bind(null, id)}
        cancelHref={`/forum/${id}`}
        submitLabel="Konuyu güncelle"
      />
    </div>
  );
}
