"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { GROUP_NOTE_KIND_LABELS } from "@/lib/constants";
import { createGroupNote, type GroupNoteFormState } from "./actions";

type NoteKind = keyof typeof GROUP_NOTE_KIND_LABELS;

const INITIAL: GroupNoteFormState = { ok: true };

export function GroupNoteForm({
  allowedKinds,
  defaultKind,
}: {
  allowedKinds: NoteKind[];
  defaultKind: NoteKind;
}) {
  const [state, action, pending] = useActionState(createGroupNote, INITIAL);
  const singleKind = allowedKinds.length === 1;

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
            <Field name="kind" label="Not türü" required error={state.errors?.kind}>
              {singleKind ? (
                <div className="flex h-10 items-center rounded-md border px-3 text-sm">
                  <input type="hidden" name="kind" value={defaultKind} />
                  <Badge variant="secondary">{GROUP_NOTE_KIND_LABELS[defaultKind]}</Badge>
                </div>
              ) : (
                <Select name="kind" defaultValue={defaultKind}>
                  <SelectTrigger id="kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedKinds.map((k) => (
                      <SelectItem key={k} value={k}>
                        {GROUP_NOTE_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field name="title" label="Konu" required error={state.errors?.title}>
              <Input id="title" name="title" required maxLength={200} />
            </Field>

            <Field name="body" label="Açıklama" required error={state.errors?.body} className="md:col-span-2">
              <Textarea id="body" name="body" rows={6} required maxLength={5000} />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Resim / Belge Ekle</p>
            <AttachmentInput disabled={pending} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href="/calisma-grubum?tab=notlar">Vazgeç</Link>
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                "Notu kaydet"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
