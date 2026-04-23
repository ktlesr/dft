import { PageHeader } from "@/components/app/page-header";
import { SuccessfulProjectForm } from "@/features/records/successful-project-form";

export const metadata = { title: "Başarılı Proje Kaydı" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Başarılı Proje Kaydı"
        description="Kabul edilmiş ve/veya tamamlanmış projeleriniz."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Başarılı Proje" }]}
      />
      <SuccessfulProjectForm />
    </div>
  );
}
