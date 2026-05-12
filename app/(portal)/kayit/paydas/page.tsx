import { PageHeader } from "@/components/app/page-header";
import { StakeholderForm } from "@/features/records/stakeholder-form";

export const metadata = { title: "Paydaş" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Paydaş"
        description="DFT'nin ağ oluşturma çalışmaları kapsamında faydalı olabilecek ulusal / uluslararası paydaşlar."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Paydaş" }]}
      />
      <StakeholderForm />
    </div>
  );
}
