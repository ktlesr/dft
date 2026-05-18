import Link from "next/link";
import { Globe2, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Panolar" };

export default function BoardsIndexPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Panolar"
        description="DFT'nin genel panosu ve çalışma grubunuza özel grup panosu."
        breadcrumbs={[{ label: "Panolar" }]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/panolar/genel" className="group">
          <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold group-hover:text-primary">Genel Pano</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tüm DFT üyelerine açık paylaşımlar: haberler, duyurular, öneriler, fikirler, kaynaklar.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/panolar/grup" className="group">
          <Card className="h-full transition-all hover:border-accent/40 hover:shadow-md">
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold group-hover:text-accent">Grup Panosu</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Yalnızca çalışma grubunuza özel paylaşımlar. Grup dışına açılmaz.
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
