"use client";

import * as React from "react";
import { useActionState, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { createReportTemplate, type ReportTemplateFormState } from "./actions";

const INITIAL: ReportTemplateFormState = { ok: true };
const TEMPLATE_ACCEPT =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation";

type GroupOption = {
  id: string;
  code: string;
  name: string;
};

function groupLabel(group: GroupOption): string {
  return group.name.trim().toLowerCase() === group.code.trim().toLowerCase()
    ? group.code
    : `${group.code} - ${group.name}`;
}

export function ReportTemplateForm({ groups }: { groups: GroupOption[] }) {
  const [state, action, pending] = useActionState(createReportTemplate, INITIAL);
  const [scope, setScope] = useState<"GENEL" | "GROUPS">("GENEL");

  // Başarılı submit sonrası "Şablon Dosyaları" yükleme kutusunda dosya
  // adının asılı kalmaması için: pending→ok geçişinde AttachmentInput'u
  // sıfırla. Hata varsa key'i bump etmiyoruz → kullanıcı dosyayı kaybetmez.
  const [attachmentsResetKey, setAttachmentsResetKey] = React.useState(0);
  const wasPendingRef = React.useRef(false);
  React.useEffect(() => {
    if (wasPendingRef.current && !pending && state.ok && !state.errors) {
      setAttachmentsResetKey((k) => k + 1);
    }
    wasPendingRef.current = pending;
  }, [pending, state]);

  return (
    <form action={action}>
      <Card>
        <CardContent className="space-y-5 p-6">
          {!state.ok && (state.message || state.errors) ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {state.message ?? "Formda eksik veya hatalı alanlar var."}
              </AlertDescription>
            </Alert>
          ) : null}

          {state.ok && state.message ? (
            <Alert variant="success">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <Field name="title" label="Şablon Başlığı" required error={state.errors?.title} className="md:col-span-2">
              <Input id="title" name="title" required maxLength={200} placeholder="Örn: Aylık Faaliyet Raporu Şablonu" />
            </Field>

            <Field name="scope" label="Kapsam" required error={state.errors?.scope} className="md:col-span-2">
              <Select name="scope" value={scope} onValueChange={(v) => setScope(v as "GENEL" | "GROUPS")}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENEL">Genel</SelectItem>
                  <SelectItem value="GROUPS">Belli Gruplar</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {scope === "GROUPS" ? (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium">Hedef Gruplar</Label>
                {state.errors?.targetGroupIds ? (
                  <p className="text-xs font-medium text-destructive">{state.errors.targetGroupIds[0]}</p>
                ) : null}
                <div className="grid max-h-60 gap-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2 md:grid-cols-3">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2 rounded-md p-1.5 transition-colors hover:bg-muted/40">
                      <Checkbox id={`template-group-${group.id}`} name="targetGroupIds" value={group.id} />
                      <label
                        htmlFor={`template-group-${group.id}`}
                        className="cursor-pointer select-none text-xs font-medium leading-none"
                      >
                        {groupLabel(group)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Field name="description" label="Açıklama" error={state.errors?.description} className="md:col-span-2">
              <Textarea id="description" name="description" rows={4} maxLength={3000} placeholder="Şablon kullanım notlarını ekleyin..." />
            </Field>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-medium">Şablon Dosyaları (docx, xlsx, pptx, pdf)</Label>
            <AttachmentInput
              disabled={pending}
              accept={TEMPLATE_ACCEPT}
              resetKey={attachmentsResetKey}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                "Şablonu kaydet"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
