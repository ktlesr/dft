import { BarChart3 } from "lucide-react";

import { AdminPanelNav } from "@/components/app/admin-nav";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { FIXED_KPI_CODES, FIXED_KPI_LABELS } from "@/lib/kpi/constants";
import {
  adminUpdateCustomKpiTargets,
  adminUpdateFixedKpiTarget,
} from "@/features/kpi/actions";

export const metadata = { title: "KPI Hedefleri" };
export const dynamic = "force-dynamic";

export default async function AdminKpiTargetsPage() {
  await requireAdmin();

  const [groups, fixedTargets, customKpis] = await Promise.all([
    prisma.group.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.kpiFixedTarget.findMany({
      select: {
        groupId: true,
        metricCode: true,
        baselineValue: true,
        targetValue: true,
      },
    }),
    prisma.kpiCustom.findMany({
      where: { deletedAt: null },
      orderBy: [{ group: { code: "asc" } }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        baselineValue: true,
        targetValue: true,
        group: { select: { code: true, name: true } },
      },
    }),
  ]);

  const fixedByKey = new Map(
    fixedTargets.map((item) => [`${item.groupId}:${item.metricCode}`, item]),
  );

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="KPI Hedefleri"
        description="Sabit ve özel KPI baseline/hedef değerlerini manuel güncelleyin veya sıfırlayın."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "KPI Hedefleri" }]}
      />
      <AdminPanelNav />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Sabit KPI hedefleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz çalışma grubu yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">Grup</th>
                      <th className="px-2 py-2">KPI</th>
                      <th className="px-2 py-2">Baseline</th>
                      <th className="px-2 py-2">Revize hedef</th>
                      <th className="px-2 py-2 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.flatMap((group) =>
                      FIXED_KPI_CODES.map((code) => {
                        const target = fixedByKey.get(`${group.id}:${code}`);
                        return (
                          <tr key={`${group.id}:${code}`} className="border-b last:border-0">
                            <td className="px-2 py-2 align-middle font-medium">
                              {group.code}
                              <span className="block text-xs font-normal text-muted-foreground">
                                {group.name}
                              </span>
                            </td>
                            <td className="px-2 py-2 align-middle">{FIXED_KPI_LABELS[code]}</td>
                            <td className="px-2 py-2 align-middle">
                              <form id={`fixed-${group.id}-${code}`} action={adminUpdateFixedKpiTarget}>
                                <input type="hidden" name="groupId" value={group.id} />
                                <input type="hidden" name="metricCode" value={code} />
                                <Input
                                  name="baselineValue"
                                  inputMode="decimal"
                                  defaultValue={target?.baselineValue?.toString() ?? "0"}
                                  className="h-8"
                                  required
                                />
                              </form>
                            </td>
                            <td className="px-2 py-2 align-middle">
                              <Input
                                form={`fixed-${group.id}-${code}`}
                                name="targetValue"
                                inputMode="decimal"
                                defaultValue={target?.targetValue?.toString() ?? "0"}
                                className="h-8"
                                required
                              />
                            </td>
                            <td className="px-2 py-2 align-middle">
                              <div className="flex justify-end gap-2">
                                <Button
                                  form={`fixed-${group.id}-${code}`}
                                  type="submit"
                                  name="intent"
                                  value="update"
                                  size="sm"
                                  variant="secondary"
                                >
                                  Kaydet
                                </Button>
                                <Button
                                  form={`fixed-${group.id}-${code}`}
                                  type="submit"
                                  name="intent"
                                  value="reset"
                                  size="sm"
                                  variant="outline"
                                >
                                  Sıfırla
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Özel KPI hedefleri</CardTitle>
          </CardHeader>
          <CardContent>
            {customKpis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz özel KPI kaydı yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-2">Grup</th>
                      <th className="px-2 py-2">KPI</th>
                      <th className="px-2 py-2">Baseline</th>
                      <th className="px-2 py-2">Revize hedef</th>
                      <th className="px-2 py-2 text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customKpis.map((kpi) => (
                      <tr key={kpi.id} className="border-b last:border-0">
                        <td className="px-2 py-2 align-middle font-medium">
                          {kpi.group.code}
                          <span className="block text-xs font-normal text-muted-foreground">
                            {kpi.group.name}
                          </span>
                        </td>
                        <td className="px-2 py-2 align-middle">{kpi.name}</td>
                        <td className="px-2 py-2 align-middle">
                          <form id={`custom-${kpi.id}`} action={adminUpdateCustomKpiTargets}>
                            <input type="hidden" name="kpiId" value={kpi.id} />
                            <Input
                              name="baselineValue"
                              inputMode="decimal"
                              defaultValue={kpi.baselineValue?.toString() ?? "0"}
                              className="h-8"
                              required
                            />
                          </form>
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <Input
                            form={`custom-${kpi.id}`}
                            name="targetValue"
                            inputMode="decimal"
                            defaultValue={kpi.targetValue?.toString() ?? "0"}
                            className="h-8"
                            required
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="flex justify-end gap-2">
                            <Button
                              form={`custom-${kpi.id}`}
                              type="submit"
                              name="intent"
                              value="update"
                              size="sm"
                              variant="secondary"
                            >
                              Kaydet
                            </Button>
                            <Button
                              form={`custom-${kpi.id}`}
                              type="submit"
                              name="intent"
                              value="reset"
                              size="sm"
                              variant="outline"
                            >
                              Sıfırla
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
