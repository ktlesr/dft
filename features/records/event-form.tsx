"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { createEventRecord, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function EventForm() {
  const [state, action, pending] = useActionState(createEventRecord, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Etkinlik adı" required error={state.errors?.name} className="md:col-span-2">
            <Input id="name" name="name" required maxLength={200} />
          </Field>

          <Field name="kind" label="Etkinlik türü" error={state.errors?.kind}>
            <Input id="kind" name="kind" maxLength={120} placeholder="Konferans / Çalıştay / Panel …" />
          </Field>
          <Field name="date" label="Tarih" required error={state.errors?.date}>
            <Input id="date" name="date" type="date" required />
          </Field>

          <Field name="location" label="Yer" error={state.errors?.location}>
            <Input id="location" name="location" maxLength={200} />
          </Field>
          <Field name="role" label="Rolünüz" error={state.errors?.role}>
            <Input id="role" name="role" maxLength={120} placeholder="Konuşmacı / Katılımcı / Düzenleyici" />
          </Field>

          <Field name="topic" label="İlgili konu / program" error={state.errors?.topic} className="md:col-span-2">
            <Input id="topic" name="topic" maxLength={200} />
          </Field>

          <Field name="summary" label="Kısa özet" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={4} maxLength={3000} />
          </Field>

          <Field name="notes" label="Notlar" error={state.errors?.notes} className="md:col-span-2">
            <Textarea id="notes" name="notes" rows={3} maxLength={2000} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
