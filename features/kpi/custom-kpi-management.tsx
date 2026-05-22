"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import {
  completeCustomKpi,
  reviseCustomKpiBaseline,
  reviseCustomKpiTarget,
  setCustomKpiApproval,
  type KpiFormState,
} from "@/features/kpi/actions";
import { KPI_FORM_INITIAL } from "@/features/kpi/form-state";
import type { CustomKpiListItem } from "@/lib/kpi/queries";

export function CustomKpiManagement({
  kpis,
  isAdmin,
  currentGroupId,
}: {
  kpis: CustomKpiListItem[];
  isAdmin: boolean;
  currentGroupId: string | null;
}) {
  if (kpis.length === 0) {
    return <p className="text-sm text-muted-foreground">Henüz özel KPI kaydı yok.</p>;
  }

  return (
    <div className="space-y-4">
      {kpis.map((kpi) => (
        <KpiCard
          key={kpi.id}
          kpi={kpi}
          isAdmin={isAdmin}
          currentGroupId={currentGroupId}
        />
      ))}
    </div>
  );
}

function KpiCard({
  kpi,
  isAdmin,
  currentGroupId,
}: {
  kpi: CustomKpiListItem;
  isAdmin: boolean;
  currentGroupId: string | null;
}) {
  const canManage = isAdmin || (!!currentGroupId && currentGroupId === kpi.groupId);
  const canBaseline = isAdmin;
  const [approvalState, approvalAction, approvalPending] = useActionState<KpiFormState, FormData>(
    setCustomKpiApproval,
    KPI_FORM_INITIAL,
  );
  const [targetState, targetAction, targetPending] = useActionState<KpiFormState, FormData>(
    reviseCustomKpiTarget,
    KPI_FORM_INITIAL,
  );
  const [baselineState, baselineAction, baselinePending] = useActionState<KpiFormState, FormData>(
    reviseCustomKpiBaseline,
    KPI_FORM_INITIAL,
  );
  const [completionState, completionAction, completionPending] = useActionState<KpiFormState, FormData>(
    completeCustomKpi,
    KPI_FORM_INITIAL,
  );

  // Tamamlama formu state döndürüyor (redirect yok), bu yüzden başarılı
  // submit sonrası AttachmentInput'taki staged dosya listesini sıfırlamak
  // için aynı pattern. Sadece completion action takip ediliyor — target/
  // baseline formlarının pending'i bu key'i bump etmemeli.
  const [attachmentsResetKey, setAttachmentsResetKey] = React.useState(0);
  const wasCompletionPendingRef = React.useRef(false);
  React.useEffect(() => {
    if (
      wasCompletionPendingRef.current &&
      !completionPending &&
      completionState.ok &&
      !completionState.errors
    ) {
      setAttachmentsResetKey((k) => k + 1);
    }
    wasCompletionPendingRef.current = completionPending;
  }, [completionPending, completionState]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{kpi.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {kpi.groupCode} · {kpi.createdByName} · {dt(kpi.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{kpi.status}</Badge>
            <Badge variant={kpi.approvalStatus === "APPROVED" ? "success" : "outline"}>
              {kpi.approvalStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {kpi.description ? <p className="text-sm">{kpi.description}</p> : null}

        <div className="grid gap-3 md:grid-cols-3">
          <Info label="Hedef değer" value={kpi.targetValue ?? "-"} />
          <Info label="Gerçekleşen değer" value={kpi.actualValue ?? "-"} />
          <Info label="Baseline" value={kpi.baselineValue ?? "-"} />
        </div>

        <TargetProgress
          targetValue={kpi.targetValue}
          actualValue={kpi.actualValue}
          status={kpi.status}
        />

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sorumlular
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {kpi.assignees.map((a, idx) => (
              <Badge key={`${kpi.id}-asg-${idx}`} variant="outline">
                {a.label}
              </Badge>
            ))}
          </div>
        </div>

        {canManage ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {kpi.approvalStatus === "PENDING" ? (
              <form action={approvalAction} className="rounded-md border p-3 space-y-2">
                <input type="hidden" name="kpiId" value={kpi.id} />
                <p className="text-sm font-medium">Onay</p>
                <Input name="reason" placeholder="Red nedeni (opsiyonel)" />
                {approvalState.message ? (
                  <Alert variant={approvalState.ok ? "success" : "destructive"}>
                    <AlertDescription>{approvalState.message}</AlertDescription>
                  </Alert>
                ) : null}
                {approvalState.errors?._?.[0] ? (
                  <p className="text-xs text-destructive">{approvalState.errors._[0]}</p>
                ) : null}
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    name="decision"
                    value="APPROVE"
                    size="sm"
                    disabled={approvalPending}
                  >
                    {approvalPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Onayla
                  </Button>
                  <Button
                    type="submit"
                    name="decision"
                    value="REJECT"
                    size="sm"
                    variant="outline"
                    disabled={approvalPending}
                  >
                    <XCircle className="h-4 w-4" />
                    Reddet
                  </Button>
                </div>
              </form>
            ) : null}

            <form action={targetAction} className="rounded-md border p-3 space-y-2">
              <input type="hidden" name="kpiId" value={kpi.id} />
              <p className="text-sm font-medium">Hedef Revizyonu</p>
              <Input
                name="targetValue"
                inputMode="decimal"
                defaultValue={kpi.targetValue ?? ""}
                placeholder="Hedef değer"
              />
              <Input name="reason" placeholder="Revizyon notu (opsiyonel)" />
              <FormMessage state={targetState} />
              <Button size="sm" type="submit" disabled={targetPending}>
                {targetPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Hedefi güncelle
              </Button>
            </form>

            {canBaseline ? (
              <form action={baselineAction} className="rounded-md border p-3 space-y-2">
                <input type="hidden" name="kpiId" value={kpi.id} />
                <p className="text-sm font-medium">Baseline Revizyonu (Admin)</p>
                <Input
                  name="baselineValue"
                  inputMode="decimal"
                  defaultValue={kpi.baselineValue ?? ""}
                  placeholder="Baseline"
                />
                <Input name="reason" placeholder="Değişiklik nedeni" />
                <FormMessage state={baselineState} />
                <Button size="sm" type="submit" disabled={baselinePending}>
                  {baselinePending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Baseline güncelle
                </Button>
              </form>
            ) : null}

            <form action={completionAction} className="rounded-md border p-3 space-y-2">
              <input type="hidden" name="kpiId" value={kpi.id} />
              <p className="text-sm font-medium">Tamamlama ve Kanit</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Select name="completionType" defaultValue="COMPLETED">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPLETED">Basarili tamamlandi</SelectItem>
                    <SelectItem value="OVERACHIEVED">Hedef ustu tamamlandi</SelectItem>
                  </SelectContent>
                </Select>
                <Input name="actualValue" inputMode="decimal" placeholder="Gerceklesen deger" />
              </div>
              <Textarea name="note" rows={2} placeholder="Not (opsiyonel)" />
              <AttachmentInput
                disabled={completionPending}
                resetKey={attachmentsResetKey}
              />
              <FormMessage state={completionState} />
              <Button size="sm" type="submit" disabled={completionPending}>
                {completionPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Tamamlama kaydı ekle
              </Button>
            </form>
          </div>
        ) : null}

        <details className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">Revizyon ve Kanit Gecmisi</summary>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <HistoryList
              title="Hedef revizyonlari"
              items={kpi.revisions.map((r) => ({
                id: r.id,
                text: `${revField(r.field)}: ${r.oldValue ?? "-"} -> ${r.newValue ?? "-"} (${r.changedByName})`,
                sub: `${dt(r.createdAt)}${r.reason ? ` · ${r.reason}` : ""}`,
              }))}
              empty="Hedef revizyonu yok."
            />
            <HistoryList
              title="Baseline gecmisi"
              items={kpi.baselineHistory.map((r) => ({
                id: r.id,
                text: `${revField(r.field)}: ${r.oldValue ?? "-"} -> ${r.newValue ?? "-"} (${r.changedByName})`,
                sub: `${dt(r.createdAt)}${r.reason ? ` · ${r.reason}` : ""}`,
              }))}
              empty="Baseline degisikligi yok."
            />
            <HistoryList
              title="Kanitlar"
              items={kpi.evidences.map((e) => ({
                id: e.id,
                text: `${e.evidenceType}: ${e.attachment.originalName}`,
                sub: `${e.uploadedByName} · ${dt(e.createdAt)}`,
                href: `/api/dosya/${e.attachment.id}`,
              }))}
              empty="Kanit dokumani yok."
            />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

function FormMessage({ state }: { state: KpiFormState }) {
  if (state.message) {
    return (
      <Alert variant={state.ok ? "success" : "destructive"}>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  const error = state.errors && Object.values(state.errors)[0]?.[0];
  if (!error) return null;
  return <p className="text-xs text-destructive">{error}</p>;
}

function HistoryList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ id: string; text: string; sub?: string; href?: string }>;
  empty: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className="rounded border px-2 py-1.5 text-xs">
              {it.href ? (
                <a href={it.href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                  {it.text}
                </a>
              ) : (
                <p className="font-medium">{it.text}</p>
              )}
              {it.sub ? <p className="text-muted-foreground">{it.sub}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function TargetProgress({
  targetValue,
  actualValue,
  status,
}: {
  targetValue: string | null;
  actualValue: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "OVERACHIEVED";
}) {
  const target = toNumber(targetValue);
  const actual = toNumber(actualValue);
  if (!target || target <= 0) {
    return (
      <div className="rounded-md border px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Hedef / Gerceklesen
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Info-grafik icin hedef deger girilmelidir.</p>
      </div>
    );
  }

  const ratio = Math.max(0, actual / target);
  const pct = Math.round(ratio * 100);
  const bar = Math.min(100, pct);
  const over = Math.max(0, pct - 100);
  const tone =
    status === "OVERACHIEVED" || pct > 100
      ? "bg-emerald-500"
      : status === "COMPLETED" || pct === 100
        ? "bg-blue-500"
        : "bg-amber-500";

  return (
    <div className="rounded-md border px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Hedef / Gerceklesen
        </p>
        <p className="text-xs font-semibold">{pct}%</p>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${bar}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Hedef: {target}</span>
        <span>Gerceklesen: {actual}</span>
      </div>
      {over > 0 ? <p className="mt-1 text-xs text-emerald-600">Hedef ustu: +{over}%</p> : null}
    </div>
  );
}

function d(value: Date | null) {
  if (!value) return "-";
  return value.toLocaleDateString("tr-TR");
}

function dt(value: Date) {
  return value.toLocaleString("tr-TR");
}

function dateInput(value: Date | null) {
  if (!value) return "";
  const y = value.getFullYear();
  const m = `${value.getMonth() + 1}`.padStart(2, "0");
  const d = `${value.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function revField(field: "TARGET_VALUE" | "TARGET_DATE") {
  return field === "TARGET_VALUE" ? "Deger" : "Tarih";
}

function toNumber(value: string | null) {
  if (!value) return 0;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
