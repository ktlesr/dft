import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { MeetingResultForm } from "@/features/meeting-result/meeting-result-form";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { isAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Toplantı Sonucu Ekle" };
export const dynamic = "force-dynamic";

export default async function NewMeetingResultPage() {
  const user = await requireActiveUser();
  if (!isAdmin(user)) {
    await redirectUnauthorized();
  }

  const groups = await prisma.group.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Toplantı Sonucu Ekle"
        description="Toplantı sonuçlarını, kararlarını ve ilgili ekli dosyayı tüm çalışma grupları veya belirli hedef grupları için paylaşın."
        breadcrumbs={[{ label: "Grup Çalışmaları", href: "/calisma-grubum" }, { label: "Toplantı Sonucu Ekle" }]}
      />
      <MeetingResultForm groups={groups} />
    </div>
  );
}
