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
import { createMinute, type MinuteFormState } from "./actions";
import { formatDateTime } from "@/lib/utils";

const INITIAL: MinuteFormState = { ok: true };

type MeetingOption = { id: string; title: string; startAt: Date };
type MinuteAction = (prev: MinuteFormState, fd: FormData) => Promise<MinuteFormState>;
type MinuteDefaults = {
  meetingId: string;
  date: string;
  attendees: string;
  topics: string;
  decisions: string;
  summary: string | null;
};

export function MinuteForm({
  meetings,
  defaultMeetingId,
  defaults,
  action: actionFn = createMinute,
  cancelHref = "/calisma-grubum",
  submitLabel = "Tutanağı kaydet",
}: {
  meetings: MeetingOption[];
  defaultMeetingId?: string;
  defaults?: MinuteDefaults;
  action?: MinuteAction;
  cancelHref?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);

  const defaultDate = defaults?.date ?? new Date().toISOString().slice(0, 10);

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
            <Field name="meetingId" label="İlgili toplantı" required error={state.errors?.meetingId} className="md:col-span-2">
              <Select name="meetingId" defaultValue={defaults?.meetingId ?? defaultMeetingId ?? meetings[0]?.id}>
                <SelectTrigger id="meetingId">
                  <SelectValue placeholder="Toplantı seçin…" />
                </SelectTrigger>
                <SelectContent>
                  {meetings.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Grubunuzda henüz toplantı yok.
                    </div>
                  ) : (
                    meetings.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title} — {formatDateTime(m.startAt)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field name="date" label="Tutanak tarihi" required error={state.errors?.date}>
              <Input id="date" name="date" type="date" required defaultValue={defaultDate} />
            </Field>

            <Field name="attendees" label="Katılanlar" required error={state.errors?.attendees} className="md:col-span-2">
              <Textarea id="attendees" name="attendees" rows={3} required maxLength={5000} placeholder="Her satıra bir katılımcı" defaultValue={defaults?.attendees} />
            </Field>

            <Field name="topics" label="Görüşülen konular" required error={state.errors?.topics} className="md:col-span-2">
              <Textarea id="topics" name="topics" rows={5} required maxLength={10000} defaultValue={defaults?.topics} />
            </Field>

            <Field name="decisions" label="Alınan kararlar" required error={state.errors?.decisions} className="md:col-span-2">
              <Textarea id="decisions" name="decisions" rows={5} required maxLength={10000} defaultValue={defaults?.decisions} />
            </Field>

            <Field name="summary" label="Kısa sonuç" error={state.errors?.summary} className="md:col-span-2">
              <Textarea id="summary" name="summary" rows={3} maxLength={3000} defaultValue={defaults?.summary ?? ""} />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Ek dosyalar</p>
            <AttachmentInput disabled={pending} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href={cancelHref}>Vazgeç</Link>
            </Button>
            <Button type="submit" variant="brand" disabled={pending || meetings.length === 0}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
