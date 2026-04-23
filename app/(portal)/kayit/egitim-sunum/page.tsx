import { PageHeader } from "@/components/app/page-header";
import { TrainingForm } from "@/features/records/training-form";

export const metadata = { title: "Eğitim / Sunum Kaydı" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Eğitim / Sunum Kaydı"
        description="Verdiğiniz eğitim, sunum ve akademik paylaşımlar."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Eğitim / Sunum" }]}
      />
      <TrainingForm />
    </div>
  );
}
