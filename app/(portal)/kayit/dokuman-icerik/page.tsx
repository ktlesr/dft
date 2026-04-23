import { PageHeader } from "@/components/app/page-header";
import { ContentForm } from "@/features/records/content-form";

export const metadata = { title: "Doküman / İçerik Kaydı" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Doküman / İçerik Kaydı"
        description="Ürettiğiniz içerik, rapor ve dokümanlar."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Doküman / İçerik" }]}
      />
      <ContentForm />
    </div>
  );
}
