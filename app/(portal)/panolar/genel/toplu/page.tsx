import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/current-user";
import { BulkImportForm } from "@/features/board/bulk-import-form";

export const metadata = { title: "Toplu içe aktarma · Genel Pano" };
export const dynamic = "force-dynamic";

export default async function GeneralBoardBulkImportPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Genel panoya toplu içe aktarma"
        description="Doldurulmuş Excel şablonu ile birden fazla paylaşımı tek seferde ekleyin. Satırlardan herhangi birinde hata olursa hiçbir kayıt oluşturulmaz."
        breadcrumbs={[
          { label: "Panolar", href: "/panolar" },
          { label: "Genel", href: "/panolar/genel" },
          { label: "Toplu içe aktarma" },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link href="/panolar/genel">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
          </Button>
        }
      />
      <BulkImportForm />
    </div>
  );
}
