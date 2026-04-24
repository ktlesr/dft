"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/features/shared/form-field";
import { createContentRecord, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

// Stored verbatim in `ContentRecord.kind` (String) — no enum migration.
const CONTENT_KINDS = ["Rapor", "Makale", "Sunum", "Bilgi Notu", "Kitap"] as const;

export function ContentForm() {
  const [state, action, pending] = useActionState(createContentRecord, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="İçerik başlığı" required error={state.errors?.title} className="md:col-span-2">
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field name="kind" label="Döküman / İçerik türü" required error={state.errors?.kind}>
            <Select name="kind" defaultValue="Rapor">
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="date" label="Tarih" required error={state.errors?.date}>
            <Input id="date" name="date" type="date" required />
          </Field>

          <Field name="tags" label="Etiketler" hint="Virgülle ayırın. En fazla 20." error={state.errors?.tags} className="md:col-span-2">
            <Input id="tags" name="tags" placeholder="örn. yönetişim, veri, pilot" />
          </Field>

          <Field name="summary" label="Açıklama" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={4} maxLength={3000} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
