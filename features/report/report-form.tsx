"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { REPORT_KIND_LABELS } from "@/lib/constants";
import { createReport, type ReportFormState } from "./actions";

const INITIAL: ReportFormState = { ok: true };

export function ReportForm({ defaultKind = "YOL_HARITASI" }: { defaultKind?: keyof typeof REPORT_KIND_LABELS }) {
  const [state, action, pending] = useActionState(createReport, INITIAL);

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

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="kind" label="Rapor türü" required error={state.errors?.kind}>
              <Select name="kind" defaultValue={defaultKind}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REPORT_KIND_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field name="title" label="Başlık" required error={state.errors?.title}>
              <Input id="title" name="title" required maxLength={200} />
            </Field>

            <Field name="summary" label="Özet" error={state.errors?.summary} className="md:col-span-2">
              <Textarea id="summary" name="summary" rows={4} maxLength={3000} />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Rapor Ekle</p>
            <AttachmentInput disabled={pending} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href="/calisma-grubum">Vazgeç</Link>
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                "Raporu kaydet"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
