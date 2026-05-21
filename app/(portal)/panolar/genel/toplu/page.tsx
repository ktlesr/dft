import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/current-user";
import { BulkImportForm } from "@/features/board/bulk-import-form";

export const metadata = { title: "Toplu içe aktarma · Genel Pano" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ kategori?: string }>;

export default async function GeneralBoardBulkImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { kategori } = await searchParams;
  const isCallGrant = kategori === "cagri-hibe-etkinlik";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={
          isCallGrant
            ? "Çağrı/Hibe Duyurularına toplu içe aktarma"
            : "Genel panoya toplu içe aktarma"
        }
        description={
          isCallGrant
            ? "Doldurulmuş Çağrı/Hibe şablonu ile birden fazla duyuruyu tek seferde ekleyin. Tüm satırlar Çağrı/Hibe Duyurusu olarak kaydedilir; herhangi bir hata varsa hiçbir kayıt oluşturulmaz."
            : "Doldurulmuş Excel şablonu ile birden fazla paylaşımı tek seferde ekleyin. Satırlardan herhangi birinde hata olursa hiçbir kayıt oluşturulmaz."
        }
        breadcrumbs={[
          { label: "Panolar", href: "/panolar" },
          {
            label: "Genel",
            href: isCallGrant
              ? "/panolar/genel?kategori=cagri-hibe-etkinlik"
              : "/panolar/genel",
          },
          { label: "Toplu içe aktarma" },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link
              href={
                isCallGrant
                  ? "/panolar/genel?kategori=cagri-hibe-etkinlik"
                  : "/panolar/genel"
              }
            >
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
          </Button>
        }
      />
      <BulkImportForm kategori={isCallGrant ? "cagri-hibe-etkinlik" : undefined} />
    </div>
  );
}
