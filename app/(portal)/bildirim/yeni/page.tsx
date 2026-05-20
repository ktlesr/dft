import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin, isModerator } from "@/lib/rbac";
import { NoticePageForm } from "@/features/notice/notice-page-form";

export const metadata = { title: "Bildirim Ekle" };
export const dynamic = "force-dynamic";

export default async function NewBildirimPage() {
  const user = await requireActiveUser();
  const admin = isAdmin(user);
  const moderator = isModerator(user);

  if (!admin && !moderator) await redirectUnauthorized();

  if (!user.groupId && !admin) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="Bildirim Ekle" breadcrumbs={[{ label: "Bildirim Ekle" }]} />
        <EmptyState
          icon={Users}
          title="Bir çalışma grubuna atanmadınız"
          description="Yöneticiniz grubu atadıktan sonra bildirim oluşturabilirsiniz."
        />
      </div>
    );
  }

  const groups = admin
    ? await prisma.group.findMany({
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      })
    : user.groupId && user.groupCode
      ? [{ id: user.groupId, code: user.groupCode, name: user.groupCode }]
      : [];

  const defaultGroupId = user.groupId ?? groups[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Bildirim Ekle"
        description={
          admin
            ? "Yönetici olarak bildirimin genel mi grup bazlı mı olduğunu seçebilirsiniz."
            : user.groupCode
              ? `${user.groupCode} grubunun üyeleri bu bildirimi görür.`
              : "Bildirim atandığınız çalışma grubunda yayımlanır."
        }
        breadcrumbs={[
          { label: "Çalışma Grubum", href: "/calisma-grubum" },
          { label: "Bildirim Ekle" },
        ]}
      />

      <NoticePageForm
        isAdmin={admin}
        groups={groups}
        defaultGroupId={defaultGroupId}
        canPin={admin || moderator}
      />
    </div>
  );
}
