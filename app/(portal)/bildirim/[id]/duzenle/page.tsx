import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { updateNoticeFromPage } from "@/features/notice/actions";
import { NoticePageForm } from "@/features/notice/notice-page-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateNotice, isAdmin } from "@/lib/rbac";

export const metadata = { title: "Bildirim Düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function dateTimeLocal(value: Date | null): string {
  return value ? value.toISOString().slice(0, 16) : "";
}

export default async function EditNoticePage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice || notice.deletedAt) notFound();

  const sameGroupMod =
    notice.scope === "GROUP" &&
    canCreateNotice(user, "GROUP", notice.groupId);
  if (notice.authorId !== user.id && !isAdmin(user) && !sameGroupMod) {
    await redirectUnauthorized();
  }

  const groups = isAdmin(user)
    ? await prisma.group.findMany({
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      })
    : notice.groupId
      ? await prisma.group.findMany({
          where: { id: notice.groupId },
          select: { id: true, code: true, name: true },
        })
      : [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Bildirim Düzenle"
        breadcrumbs={[
          { label: "Bildirimler", href: "/duyurular" },
          { label: "Düzenle" },
        ]}
      />
      <NoticePageForm
        isAdmin={isAdmin(user)}
        groups={groups}
        defaultGroupId={notice.groupId}
        canPin={canCreateNotice(user, notice.scope, notice.groupId)}
        action={updateNoticeFromPage.bind(null, id)}
        cancelHref={notice.scope === "GENERAL" ? "/duyurular?kanal=genel" : "/duyurular?kanal=grup"}
        submitLabel="Bildirimi güncelle"
        defaults={{
          scope: notice.scope,
          kind: notice.kind,
          groupId: notice.groupId ?? undefined,
          title: notice.title,
          body: notice.body,
          externalUrl: notice.externalUrl ?? undefined,
          eventStartAt: dateTimeLocal(notice.eventStartAt ?? notice.eventAt),
          eventEndAt: dateTimeLocal(notice.eventEndAt),
          pinned: notice.pinned,
        }}
      />
    </div>
  );
}
