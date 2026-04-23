"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { createContentRecord, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function ContentForm() {
  const [state, action, pending] = useActionState(createContentRecord, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="İçerik başlığı" required error={state.errors?.title} className="md:col-span-2">
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field name="kind" label="İçerik türü" error={state.errors?.kind}>
            <Input id="kind" name="kind" maxLength={120} placeholder="Rapor / Not / Sunum / Makale …" />
          </Field>
          <Field name="date" label="Tarih" required error={state.errors?.date}>
            <Input id="date" name="date" type="date" required />
          </Field>

          <Field name="mainDocument" label="Esas belge" error={state.errors?.mainDocument} className="md:col-span-2">
            <Input id="mainDocument" name="mainDocument" maxLength={200} placeholder="Belge adı veya bağlantı" />
          </Field>

          <Field name="tags" label="Etiketler" hint="Virgülle ayırın. En fazla 20." error={state.errors?.tags} className="md:col-span-2">
            <Input id="tags" name="tags" placeholder="örn. yönetişim, veri, pilot" />
          </Field>

          <Field name="summary" label="Kısa açıklama" error={state.errors?.summary} className="md:col-span-2">
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
