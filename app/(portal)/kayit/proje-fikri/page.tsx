import { PageHeader } from "@/components/app/page-header";
import { ProjectIdeaForm } from "@/features/records/project-idea-form";

export const metadata = { title: "Proje Fikri" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Proje Fikri"
        description="Herhangi bir çağrıya sunulmamış proje fikirleri."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Proje Fikri" }]}
      />
      <ProjectIdeaForm />
    </div>
  );
}
