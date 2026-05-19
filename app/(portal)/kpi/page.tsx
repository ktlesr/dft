import Link from "next/link";
import { BarChart3, PlusCircle, Users } from "lucide-react";

import { FilterSelect } from "@/components/app/filter-select";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { FIXED_KPI_CODES } from "@/lib/kpi/constants";
import { getFixedKpiOverview } from "@/lib/kpi/queries";
import { canAccessKpiModule, isAdmin } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "KPI Takip" };
export const dynamic = "force-dynamic";

type KpiPageSearchParams = Promise<{ group?: string }>;

export default async function KpiPage({ searchParams }: { searchParams: KpiPageSearchParams }) {
  const user = await requireActiveUser();
  if (!canAccessKpiModule(user)) await redirectUnauthorized();

  if (!isAdmin(user) && !user.groupId) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader title="KPI Takip" breadcrumbs={[{ label: "KPI Takip" }]} />
        <EmptyState
          icon={Users}
          title="Bir calisma grubuna atanmadiniz"
          description="KPI metrikleri grup bazli hesaplandigi icin bu ekran icin grup atamasi gerekir."
        />
      </div>
    );
  }

  const { group } = await searchParams;
  const overview = await getFixedKpiOverview(user, group ?? null);
  const total = overview.summaries.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="KPI Takip"
        description="Sabit KPI metrikleri, kayit formlarina girilen verilerden otomatik hesaplanir."
        breadcrumbs={[{ label: "KPI Takip" }]}
        actions={
          <Button asChild variant="brand">
            <Link href="/kpi/yeni">
              <PlusCircle className="h-4 w-4" />
              KPI Ekle
            </Link>
          </Button>
        }
      />

      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertTitle>Sabit KPI seti otomatik hesaplanir</AlertTitle>
        <AlertDescription>
          Bu ekrandaki 7 KPI kayitlardan beslenir. KPI Ekle alani sadece sabit set disindaki
          ihtiyaclar icindir.
        </AlertDescription>
      </Alert>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Toplam KPI Olayi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {overview.selectedGroupCode
                ? `${overview.selectedGroupCode} grubu`
                : "Tum gruplar"}
            </p>
          </CardContent>
        </Card>

        {overview.summaries.slice(0, 3).map((item) => (
          <Card key={item.code}>
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Son hareket: {item.lastOccurredAt ? formatDateTime(item.lastOccurredAt) : "-"}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.summaries.slice(3).map((item) => (
          <Card key={item.code}>
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Son hareket: {item.lastOccurredAt ? formatDateTime(item.lastOccurredAt) : "-"}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Grup Bazli KPI Gorunumu</CardTitle>
          {isAdmin(user) ? (
            <form className="flex items-center gap-2">
              <FilterSelect
                param="group"
                value={overview.selectedGroupId ?? ""}
                allLabel="Tum gruplar"
                options={overview.availableGroups.map((g) => ({
                  value: g.id,
                  label: `${g.code} - ${g.name}`,
                }))}
                ariaLabel="KPI grup filtresi"
              />
            </form>
          ) : (
            <Badge variant="outline">{overview.selectedGroupCode ?? "-"}</Badge>
          )}
        </CardHeader>
        <CardContent>
          {overview.groupRows.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="KPI verisi yok"
              description="Kayit girildikce KPI metrikleri otomatik olarak burada gorunecek."
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">Grup</th>
                    {FIXED_KPI_CODES.map((code) => (
                      <th key={code} className="px-2 py-2">
                        {shortLabel(code)}
                      </th>
                    ))}
                    <th className="px-2 py-2">Toplam</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.groupRows.map((row) => (
                    <tr key={row.groupId} className="border-b last:border-0">
                      <td className="px-2 py-2 font-medium">{row.groupCode}</td>
                      {FIXED_KPI_CODES.map((code) => (
                        <td key={code} className="px-2 py-2">
                          {row.values[code]}
                        </td>
                      ))}
                      <td className="px-2 py-2 font-semibold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function shortLabel(code: (typeof FIXED_KPI_CODES)[number]) {
  switch (code) {
    case "KPI_PROJECT_IDEA_TOTAL":
      return "Proje Fikri";
    case "KPI_PROJECT_APPLICATION_TOTAL":
      return "Basvuru";
    case "KPI_SUCCESSFUL_PROJECT_TOTAL":
      return "Basarili";
    case "KPI_EVENT_ATTENDED_TOTAL":
      return "Etkinlik Katilim";
    case "KPI_EVENT_ORGANIZED_TOTAL":
      return "Etkinlik Duzenlenen";
    case "KPI_CONTENT_TOTAL":
      return "Dijital Icerik";
    case "KPI_STAKEHOLDER_TOTAL":
      return "Paydas";
  }
}
