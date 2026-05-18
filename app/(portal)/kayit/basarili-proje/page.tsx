import { PageHeader } from "@/components/app/page-header";
import { SuccessfulProjectForm } from "@/features/records/successful-project-form";

export const metadata = { title: "Başarılı Proje" };

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Başarılı Proje"
        description="Destek almaya hak kazanmış projeler."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Başarılı Proje" }]}
      />
      <SuccessfulProjectForm />
    </div>
  );
}
