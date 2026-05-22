"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { createDissemination, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

type DisseminationDefaults = {
  title: string;
  date: string;
  location: string | null;
  kind: string | null;
  audience: string | null;
  participantCount: number | null;
  relatedTopic: string | null;
  summary: string | null;
  notes: string | null;
};

type RecordAction = (prev: RecordFormState, fd: FormData) => Promise<RecordFormState>;

export function DisseminationForm({
  defaults,
  action: actionFn = createDissemination,
  cancelHref,
  submitLabel,
}: {
  defaults?: DisseminationDefaults;
  action?: RecordAction;
  cancelHref?: string;
  submitLabel?: string;
} = {}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} cancelHref={cancelHref} submitLabel={submitLabel}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="Faaliyet başlığı" required error={state.errors?.title} className="md:col-span-2">
            <Input id="title" name="title" required maxLength={200} defaultValue={defaults?.title} />
          </Field>

          <Field name="date" label="Tarih" required error={state.errors?.date}>
            <Input id="date" name="date" type="date" required defaultValue={defaults?.date} />
          </Field>
          <Field name="location" label="Yer / kurum" error={state.errors?.location}>
            <Input id="location" name="location" maxLength={200} defaultValue={defaults?.location ?? ""} />
          </Field>

          <Field name="kind" label="Tür" error={state.errors?.kind}>
            <Input id="kind" name="kind" maxLength={120} defaultValue={defaults?.kind ?? ""} placeholder="Seminer / Çalıştay / Yayın …" />
          </Field>
          <Field name="audience" label="Hedef kitle" error={state.errors?.audience}>
            <Input id="audience" name="audience" maxLength={200} defaultValue={defaults?.audience ?? ""} placeholder="Kamu / Akademi / STK …" />
          </Field>

          <Field name="participantCount" label="Katılımcı sayısı" error={state.errors?.participantCount}>
            <Input id="participantCount" name="participantCount" type="number" min={0} inputMode="numeric" defaultValue={defaults?.participantCount ?? ""} />
          </Field>
          <Field name="relatedTopic" label="İlgili program / konu" error={state.errors?.relatedTopic}>
            <Input id="relatedTopic" name="relatedTopic" maxLength={200} defaultValue={defaults?.relatedTopic ?? ""} />
          </Field>

          <Field name="summary" label="Kısa açıklama" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={4} maxLength={3000} defaultValue={defaults?.summary ?? ""} />
          </Field>

          <Field name="notes" label="Notlar" error={state.errors?.notes} className="md:col-span-2">
            <Textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={defaults?.notes ?? ""} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
