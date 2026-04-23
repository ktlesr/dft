"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { createMeeting, type MeetingFormState } from "./actions";

const INITIAL: MeetingFormState = { ok: true };

export function MeetingForm() {
  const [state, action, pending] = useActionState(createMeeting, INITIAL);

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
            <Field name="title" label="Toplantı başlığı" required error={state.errors?.title} className="md:col-span-2">
              <Input id="title" name="title" required maxLength={200} />
            </Field>

            <Field name="startAt" label="Başlangıç" required error={state.errors?.startAt}>
              <Input id="startAt" name="startAt" type="datetime-local" required />
            </Field>
            <Field name="endAt" label="Bitiş (opsiyonel)" error={state.errors?.endAt}>
              <Input id="endAt" name="endAt" type="datetime-local" />
            </Field>

            <Field name="location" label="Yer" error={state.errors?.location}>
              <Input id="location" name="location" maxLength={200} placeholder="Ankara — Toplantı Salonu A" />
            </Field>
            <Field name="onlineUrl" label="Çevrim içi bağlantı" hint="Zoom/Teams/Google Meet vb." error={state.errors?.onlineUrl}>
              <Input id="onlineUrl" name="onlineUrl" type="url" placeholder="https://…" />
            </Field>

            <Field name="description" label="Kısa açıklama" error={state.errors?.description} className="md:col-span-2">
              <Textarea id="description" name="description" rows={3} maxLength={2000} />
            </Field>

            <Field name="agenda" label="Gündem" hint="Madde madde yazabilirsiniz." error={state.errors?.agenda} className="md:col-span-2">
              <Textarea id="agenda" name="agenda" rows={6} maxLength={5000} />
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="pinToBoard" name="pinToBoard" value="on" defaultChecked />
            <Label htmlFor="pinToBoard" className="text-sm font-normal">
              Grup panosunda üste sabitle
            </Label>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Ek dosyalar</p>
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
                "Toplantıyı ilan et"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
