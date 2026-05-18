import { PageHeader } from "@/components/app/page-header";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { requireAdmin } from "@/lib/current-user";
import { getAboutContent } from "@/features/about/queries";
import { AboutEditForm } from "@/features/about/edit-form";

export const metadata = { title: "DFT Hakkında — Yönetim" };
export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  await requireAdmin();
  const current = await getAboutContent();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="DFT Hakkında"
        description="Üyelere açılan 'DFT Projesi Nedir?' kartı, modaldaki detaylı içerik ve eklenmiş belgeleri buradan yönetin."
        breadcrumbs={[
          { label: "Yönetim", href: "/yonetim" },
          { label: "DFT Hakkında" },
        ]}
      />
      <AdminPanelNav />

      <AboutEditForm current={current} />
    </div>
  );
}
