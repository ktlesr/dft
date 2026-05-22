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
import { TagInput } from "@/features/shared/tag-input";
import { CONTENT_KIND_LABELS } from "@/lib/constants";
import { createContentRecord, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

type ContentDefaults = {
  title: string;
  kind: string | null;
  externalUrl: string | null;
  tags: string[];
  summary: string | null;
};

type RecordAction = (prev: RecordFormState, fd: FormData) => Promise<RecordFormState>;

export function ContentForm({
  defaults,
  action: actionFn = createContentRecord,
  cancelHref,
  submitLabel,
}: {
  defaults?: ContentDefaults;
  action?: RecordAction;
  cancelHref?: string;
  submitLabel?: string;
} = {}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} cancelHref={cancelHref} submitLabel={submitLabel} attachmentsLabel="İlgili dijital içeriği yükleyin (video dışındakiler için).">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="Başlık" required error={state.errors?.title} className="md:col-span-2">
            <Input id="title" name="title" required maxLength={200} defaultValue={defaults?.title} />
          </Field>

          <Field name="kind" label="Tür" required error={state.errors?.kind}>
            <Select name="kind" defaultValue={defaults?.kind ?? "RAPOR"}>
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
            <Input id="externalUrl" name="externalUrl" type="url" defaultValue={defaults?.externalUrl ?? ""} placeholder="https://…" />
          </Field>

          <Field name="tags" label="Etiketler" hint="Virgül veya Enter ile ekleyin. En fazla 20." error={state.errors?.tags} className="md:col-span-2">
            <TagInput name="tags" defaultValue={defaults?.tags} placeholder="örn. yönetişim, veri, pilot" />
          </Field>

          <Field name="summary" label="Açıklama" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={5} maxLength={5000} defaultValue={defaults?.summary ?? ""} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
