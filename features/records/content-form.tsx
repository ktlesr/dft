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
import { CONTENT_KIND_LABELS } from "@/lib/constants";
import { createContentRecord, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function ContentForm() {
  const [state, action, pending] = useActionState(createContentRecord, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} attachmentsLabel="İlgili dijital içeriği yükleyin (video dışındakiler için).">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="Başlık" required error={state.errors?.title} className="md:col-span-2">
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field name="kind" label="Tür" required error={state.errors?.kind}>
            <Select name="kind" defaultValue="RAPOR">
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTENT_KIND_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="externalUrl" label="Bağlantı (opsiyonel)" error={state.errors?.externalUrl}>
            <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" />
          </Field>

          <Field name="tags" label="Etiketler" hint="Virgülle ayırın. En fazla 20." error={state.errors?.tags} className="md:col-span-2">
            <Input id="tags" name="tags" placeholder="örn. yönetişim, veri, pilot" />
          </Field>

          <Field name="summary" label="Açıklama" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={5} maxLength={5000} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
