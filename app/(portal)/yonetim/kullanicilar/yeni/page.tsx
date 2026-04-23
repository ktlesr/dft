import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/current-user";
import { NewUserForm } from "@/features/admin/new-user-form";
import { AdminPanelNav } from "@/components/app/admin-nav";

export const metadata = { title: "Yeni kullanıcı · Yönetim" };
export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Yeni kullanıcı oluştur"
        description="E-posta, geçici şifre, grup ve rolleri belirleyin. Hesap anında aktifleşir — bilgiyi kullanıcıya güvenli kanaldan iletin."
        breadcrumbs={[
          { label: "Yönetim", href: "/yonetim" },
          { label: "Kullanıcılar", href: "/yonetim/kullanicilar" },
          { label: "Yeni" },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link href="/yonetim/kullanicilar">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
          </Button>
        }
      />
      <AdminPanelNav />
      <NewUserForm />
    </div>
  );
}
