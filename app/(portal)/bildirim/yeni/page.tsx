import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { isAdmin, isModerator } from "@/lib/rbac";
import { GroupNoticePageForm } from "@/features/board/group-notice-page-form";

export const metadata = { title: "Bildirim Ekle" };
export const dynamic = "force-dynamic";

export default async function NewBildirimPage() {
  const user = await requireActiveUser();

  // Yalnızca admin veya moderatör erişebilir (sidebar zaten kısıtlı; doğrudan
  // URL ile gelen non-admin/non-moderator için sunucu tarafı kapı).
  if (!isAdmin(user) && !isModerator(user)) redirect("/yetkisiz");

  // Grup ataması yoksa içerik gösterme.
  if (!user.groupId && !isAdmin(user)) {
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

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Bildirim Ekle"
        description={
          user.groupCode
            ? `${user.groupCode} grubunun üyeleri bu bildirimi görür.`
            : "Bildirim, atandığınız çalışma grubunun bildirim sekmesinde yayımlanır."
        }
        breadcrumbs={[
          { label: "Çalışma Grubum", href: "/calisma-grubum" },
          { label: "Bildirim Ekle" },
        ]}
      />
      <GroupNoticePageForm canPin={isAdmin(user) || isModerator(user)} />
    </div>
  );
}
