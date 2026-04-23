import { PageHeader } from "@/components/app/page-header";
import { DisseminationForm } from "@/features/records/dissemination-form";

export const metadata = { title: "Bilgi Çoğaltımı Kaydı" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Bilgi Çoğaltımı Kaydı"
        description="Sunum, seminer, çalıştay veya yayın yoluyla yaydığınız bilgi faaliyetleri."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Bilgi Çoğaltımı" }]}
      />
      <DisseminationForm />
    </div>
  );
}
