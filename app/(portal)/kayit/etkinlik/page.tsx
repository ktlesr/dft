import { PageHeader } from "@/components/app/page-header";
import { EventForm } from "@/features/records/event-form";

export const metadata = { title: "Etkinlik Kaydı" };

export default function Page() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Etkinlik Kaydı"
        description="Katıldığınız veya düzenlediğiniz etkinlik, konferans ve çalıştay kayıtları."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Etkinlik" }]}
      />
      <EventForm />
    </div>
  );
}
