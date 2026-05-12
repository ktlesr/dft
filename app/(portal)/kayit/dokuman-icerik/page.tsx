import { PageHeader } from "@/components/app/page-header";
import { ContentForm } from "@/features/records/content-form";

export const metadata = { title: "Dijital İçerik" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Dijital İçerik"
        description="DFT çalışmaları kapsamında faydalı olabilecek dijital içerikler (rapor, makale, strateji belgesi, eğitim videosu vb.)."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Dijital İçerik" }]}
      />
      <ContentForm />
    </div>
  );
}
