import { PageHeader } from "@/components/app/page-header";
import { EventForm } from "@/features/records/event-form";

export const metadata = { title: "Etkinlik" };

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Etkinlik"
        description="Düzenlediğiniz ya da yer aldığınız toplantı, çalıştay ve ağ kurma etkinlikleri."
        breadcrumbs={[{ label: "Yeni Kayıt", href: "/kayit/yeni" }, { label: "Etkinlik" }]}
      />
      <EventForm />
    </div>
  );
}
