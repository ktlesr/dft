import { PageHeader } from "@/components/app/page-header";
import { ProjectApplicationForm } from "@/features/records/project-application-form";

export const metadata = { title: "Proje Başvurusu" };

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Proje Başvurusu"
        description="Başvurusu yapılmış ancak henüz sonuçlanmamış projeler."
        breadcrumbs={[{ label: "Yeni Kayıt Ekle", href: "/kayit/yeni" }, { label: "Proje Başvurusu" }]}
      />
      <ProjectApplicationForm />
    </div>
  );
}
