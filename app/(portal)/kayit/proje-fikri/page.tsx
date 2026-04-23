import { PageHeader } from "@/components/app/page-header";
import { ProjectIdeaForm } from "@/features/records/project-idea-form";

export const metadata = { title: "Proje Fikri / Hazırlık" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Proje Fikri / Hazırlık"
        description="Henüz başvuru aşamasında olmayan fikirler ve hazırlık kayıtları."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Proje Fikri" }]}
      />
      <ProjectIdeaForm />
    </div>
  );
}
