"use client";

import { useActionState } from "react";
import { FileText, Loader2, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { saveAboutContent, type AboutFormState } from "./actions";
import type { AboutContent } from "./schemas";

const INITIAL: AboutFormState = { ok: true };

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AboutEditForm({ current }: { current: AboutContent }) {
  const [state, action, pending] = useActionState(saveAboutContent, INITIAL);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 p-6">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <Field name="title" label="Başlık" required error={state.errors?.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={current.title}
              placeholder="DFT Projesi Nedir?"
            />
          </Field>

          <Field
            name="summary"
            label="Özet"
            hint="Hero kartın altında görünen kısa tanıtım metni."
            required
            error={state.errors?.summary}
          >
            <Textarea
              id="summary"
              name="summary"
              required
              maxLength={2000}
              rows={3}
              defaultValue={current.summary}
            />
          </Field>

          <Field
            name="body"
            label="Detaylı içerik"
            hint="'Devamı' butonuyla açılan modalda görünür. Düz metin; satır sonları korunur."
            required
            error={state.errors?.body}
          >
            <Textarea
              id="body"
              name="body"
              required
              maxLength={20000}
              rows={12}
              defaultValue={current.body}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-sm font-semibold">Mevcut belgeler</h3>
            <p className="text-xs text-muted-foreground">
              Silmek istediklerinizi işaretleyin; kaydedince kalıcı olarak kaldırılır.
            </p>
          </div>

          {current.attachments.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Henüz belge yok.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {current.attachments.map((f) => (
                <li
                  key={f.storageKey}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.originalName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {humanSize(f.size)} · {f.mimeType}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs text-destructive">
                    <input
                      type="checkbox"
                      name="removeKeys"
                      value={f.storageKey}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1.5 border-t pt-4">
            <p className="text-sm font-semibold">Yeni belge yükle</p>
            <p className="text-xs text-muted-foreground">
              Tek seferde en fazla 10 dosya, dosya başına 15 MB.
            </p>
            <AttachmentInput name="newAttachments" disabled={pending} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Kaydet
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
