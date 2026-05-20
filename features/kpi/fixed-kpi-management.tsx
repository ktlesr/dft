"use client";

import { useActionState, useState } from "react";
import { Edit3, Loader2, Target, Trophy } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FIXED_KPI_DESCRIPTIONS,
  FIXED_KPI_LABELS,
  type FixedKpiCode,
} from "@/lib/kpi/constants";
import { KPI_FORM_INITIAL, setFixedKpiTarget } from "@/features/kpi/actions";

interface KpiFixedTargetItem {
  id?: string;
  metricCode: FixedKpiCode;
  targetValue: string | null;
  targetDate: Date | null;
  baselineValue: string | null;
  baselineDate: Date | null;
}

interface FixedKpiManagementProps {
  groupId: string;
  isModerator: boolean;
  summaries: Array<{
    code: FixedKpiCode;
    label: string;
    value: number;
  }>;
  fixedTargets: KpiFixedTargetItem[];
}

export function FixedKpiManagement({
  groupId,
  isModerator,
  summaries,
  fixedTargets,
}: FixedKpiManagementProps) {
  const [selectedKpi, setSelectedKpi] = useState<FixedKpiCode | null>(null);
  const [formState, formAction, isPending] = useActionState(
    async (prev: any, fd: FormData) => {
      const res = await setFixedKpiTarget(prev, fd);
      if (res.ok) {
        setSelectedKpi(null);
      }
      return res;
    },
    KPI_FORM_INITIAL
  );

  const getTargetForCode = (code: FixedKpiCode) => {
    return fixedTargets.find((t) => t.metricCode === code) || null;
  };

  const activeTargetItem = selectedKpi ? getTargetForCode(selectedKpi) : null;

  return (
    <Card className="border-border bg-card/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
          <Target className="h-5 w-5 text-brand" />
          Sabit KPI Hedefleri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border bg-background/50">
          <table className="w-full min-w-[940px] text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Gösterge Adı ve Açıklaması</th>
                <th className="px-4 py-3 text-center">Baseline</th>
                <th className="px-4 py-3 text-center">Hedef Değer</th>
                <th className="px-4 py-3 text-center">Gerçekleşen</th>
                <th className="px-4 py-3 text-center">Durum / Kalan</th>
                {isModerator && <th className="px-4 py-3 text-right">İşlemler</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {summaries.map((item) => {
                const targetObj = getTargetForCode(item.code);
                const desc = FIXED_KPI_DESCRIPTIONS[item.code] || "";

                // Durum bar hesaplamaları
                const targetVal = targetObj ? parseFloat(targetObj.targetValue || "0") : 0;
                const baselineVal = targetObj ? parseFloat(targetObj.baselineValue || "0") : 0;
                const actualVal = item.value;

                let pct = 0;
                let tone = "bg-muted";
                let badgeText = "Hedef Yok";

                if (targetVal > 0) {
                  // İlerleme oranı formülü: (Mevcut - Baseline) / (Hedef - Baseline) ya da doğrudan actual / target
                  // Çoğu durumda doğrudan actual / target kullanılır.
                  const diff = targetVal - baselineVal;
                  if (diff > 0) {
                    pct = Math.max(0, Math.round(((actualVal - baselineVal) / diff) * 100));
                  } else {
                    pct = Math.max(0, Math.round((actualVal / targetVal) * 100));
                  }

                  if (pct >= 100) {
                    tone = "bg-emerald-500";
                    badgeText = `%${pct} Tamamlandı`;
                  } else if (pct >= 50) {
                    tone = "bg-brand";
                    badgeText = `%${pct}`;
                  } else {
                    tone = "bg-amber-500";
                    badgeText = `%${pct}`;
                  }
                }

                return (
                  <tr
                    key={item.code}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-4 py-3.5 max-w-[320px]">
                      <div className="font-semibold text-foreground">{item.label}</div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {desc}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {targetObj && targetObj.baselineValue ? (
                        <div>
                          <div className="font-medium text-foreground">
                            {parseFloat(targetObj.baselineValue)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {targetObj && targetObj.targetValue ? (
                        <div>
                          <div className="font-semibold text-foreground">
                            {parseFloat(targetObj.targetValue)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Tanımlanmamış</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-base text-foreground">
                      {item.value}
                    </td>
                    <td className="px-4 py-3.5">
                      {targetVal > 0 ? (
                        <div className="flex flex-col gap-1 w-full max-w-[150px] mx-auto">
                          <div className="flex justify-between items-center text-[10px]">
                            <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                              {badgeText}
                            </Badge>
                            <span className="font-medium">{actualVal} / {targetVal}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${tone}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-muted-foreground">
                          Hedef atanmamış
                        </div>
                      )}
                    </td>
                    {isModerator && (
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 hover:bg-brand/10 hover:text-brand"
                          onClick={() => {
                            setSelectedKpi(item.code);
                          }}
                        >
                          <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                          {targetObj ? "Hedef Düzenle" : "Hedef Tanımla"}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={selectedKpi !== null} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <form action={formAction}>
            <input type="hidden" name="groupId" value={groupId} />
            <input type="hidden" name="metricCode" value={selectedKpi || ""} />

            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand" />
                Hedef Tanımla
              </DialogTitle>
              <DialogDescription>
                {selectedKpi && FIXED_KPI_LABELS[selectedKpi]} metrik göstergesi için grup hedef değerlerini düzenleyin.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {formState.message && (
                <Alert variant={formState.ok ? "success" : "destructive"}>
                  <AlertDescription>{formState.message}</AlertDescription>
                </Alert>
              )}

              <div className="border rounded-lg p-3 bg-muted/20 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="targetValue">Hedef Değer</Label>
                  <Input
                    id="targetValue"
                    name="targetValue"
                    placeholder="Örn: 10"
                    inputMode="decimal"
                    defaultValue={activeTargetItem?.targetValue || ""}
                    required
                  />
                  {formState.errors?.targetValue?.[0] && (
                    <p className="text-[10px] text-destructive">{formState.errors.targetValue[0]}</p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedKpi(null)}
                disabled={isPending}
              >
                İptal
              </Button>
              <Button type="submit" variant="brand" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  "Hedefi Kaydet"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
