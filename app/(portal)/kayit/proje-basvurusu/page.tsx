import { PageHeader } from "@/components/app/page-header";
import { ProjectApplicationForm } from "@/features/records/project-application-form";

export const metadata = { title: "Yeni Proje Başvurusu" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Yeni Proje Başvurusu"
        description="Program/fon, çağrı, başvuru tarihi, bütçe ve ek dosyalar."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Proje Başvurusu" }]}
      />
      <ProjectApplicationForm />
    </div>
  );
}
