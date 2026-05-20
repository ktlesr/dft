"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Loader2, PlusCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { KPI_FORM_INITIAL, createCustomKpi, type KpiFormState } from "./actions";

type KpiAssignableUser = {
  id: string;
  label: string;
};

type AssigneeType = "USER_SINGLE" | "USER_MULTI" | "GROUP";

export function CustomKpiForm({
  groupId,
  groupLabel,
  members,
}: {
  groupId: string;
  groupLabel: string;
  members: KpiAssignableUser[];
}) {
  const [state, action, pending] = useActionState<KpiFormState, FormData>(
    createCustomKpi,
    KPI_FORM_INITIAL,
  );
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("USER_SINGLE");

  return (
    <form action={action}>
      <Card>
        <CardContent className="space-y-5 p-6">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          {state.ok && state.message ? (
            <Alert variant="success">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <input type="hidden" name="assigneeGroupId" value={groupId} />

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="KPI Adı" required error={state.errors?.name}>
              <Input id="name" name="name" required maxLength={160} />
            </Field>

            <Field
              name="description"
              label="Açıklama"
              error={state.errors?.description}
              className="md:col-span-2"
            >
              <Textarea id="description" name="description" rows={4} maxLength={5000} />
            </Field>

            <Field name="targetValue" label="Hedef Değer" required error={state.errors?.targetValue}>
              <Input id="targetValue" name="targetValue" inputMode="decimal" required placeholder="0" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="assigneeType" label="Sorumlu Tipi" required error={state.errors?.assigneeType}>
              <Select
                name="assigneeType"
                value={assigneeType}
                onValueChange={(v) => setAssigneeType(v as AssigneeType)}
              >
                <SelectTrigger id="assigneeType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER_SINGLE">Tek kişi</SelectItem>
                  <SelectItem value="USER_MULTI">Çoklu kişi</SelectItem>
                  <SelectItem value="GROUP">Grup</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {assigneeType === "GROUP" ? (
              <Field name="assigneeGroupId" label="Sorumlular">
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  Sorumlu grup: <span className="font-medium">{groupLabel}</span>
                </div>
              </Field>
            ) : assigneeType === "USER_SINGLE" ? (
              <Field
                name="assigneeUserIds"
                label="Sorumlu Kişi"
                required
                error={state.errors?.assigneeUserIds}
              >
                <Select name="assigneeUserIds">
                  <SelectTrigger id="assigneeUserIds">
                    <SelectValue placeholder="Kişi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Field
                name="assigneeUserIds"
                label="Sorumlular"
                required
                error={state.errors?.assigneeUserIds}
                hint="Birden fazla kişi seçilebilir."
              >
                <div className="max-h-52 space-y-2 overflow-auto rounded-md border p-3">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <Checkbox name="assigneeUserIds" value={m.id} />
                      <span>{m.label}</span>
                    </label>
                  ))}
                  {members.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Bu grupta aktif üye bulunmuyor.</p>
                  ) : null}
                </div>
              </Field>
            )}
          </div>

          <div className="flex items-center justify-end border-t pt-4">
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" />
                  KPI taslağı oluştur
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
