import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/current-user";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { UserBulkImportForm } from "@/features/admin/user-bulk-import-form";

export const metadata = { title: "Toplu üye içe aktar · Yönetim" };
export const dynamic = "force-dynamic";

export default async function BulkImportUsersPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Toplu üye içe aktar"
        description="CSV veya Excel (.xlsx) dosyasıyla birden çok üyeyi tek seferde ekleyin. Her satır için güçlü geçici şifre üretilir; sonuçta indirilebilir bir CSV özet sunulur."
        breadcrumbs={[
          { label: "Yönetim", href: "/yonetim" },
          { label: "Kullanıcılar", href: "/yonetim/kullanicilar" },
          { label: "Toplu içe aktar" },
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
      <UserBulkImportForm />
    </div>
  );
}
