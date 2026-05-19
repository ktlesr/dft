import { Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { isAdmin, isModerator } from "@/lib/rbac";
import { NewDiscussionForm } from "@/features/forum/new-discussion-form";

export const metadata = { title: "Konu Başlat" };

export default async function NewDiscussionPage() {
  const user = await requireActiveUser();

  // Grup üyeliği yoksa form göstermek yerine yönlendirici bir boş durum.
  if (!user.groupId && !isAdmin(user)) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Konu Başlat"
          breadcrumbs={[{ label: "Konu Başlat" }]}
        />
        <EmptyState
          icon={Users}
          title="Henüz bir çalışma grubuna atanmadınız"
          description="Konu başlatabilmek için yöneticinizin sizi bir gruba atamasını bekleyin."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Konu Başlat"
        description={
          user.groupCode
            ? `${user.groupCode} grubunun tüm üyeleri bu konuyu görür ve yanıt verebilir.`
            : "Konu, atandığınız çalışma grubunun forumunda yayımlanacak."
        }
        breadcrumbs={[
          { label: "Çalışma Grubum", href: "/calisma-grubum" },
          { label: "Konu Başlat" },
        ]}
      />
      <NewDiscussionForm canPin={isAdmin(user) || isModerator(user)} />
    </div>
  );
}
