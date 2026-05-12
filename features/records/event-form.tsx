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
import {
  EVENT_FORMAT_LABELS,
  EVENT_KIND_LABELS,
  EVENT_ROLE_LABELS,
} from "@/lib/constants";
import { createEventRecord, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function EventForm() {
  const [state, action, pending] = useActionState(createEventRecord, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} attachmentsLabel="Etkinlikle ilgili haber, görsel vb. içerikleri yükleyin">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Etkinlik adı" required error={state.errors?.name} className="md:col-span-2">
            <Input id="name" name="name" required maxLength={200} />
          </Field>

          <Field name="organizer" label="Etkinliği düzenleyen kuruluş" error={state.errors?.organizer}>
            <Input id="organizer" name="organizer" maxLength={200} />
          </Field>
          <Field name="date" label="Etkinlik tarihi" required error={state.errors?.date}>
            <Input id="date" name="date" type="date" required />
          </Field>

          <Field name="kind" label="Etkinlik türü" required error={state.errors?.kind}>
            <Select name="kind" defaultValue="AG_KURMA">
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_KIND_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="format" label="Etkinlik yöntemi" required error={state.errors?.format}>
            <Select name="format" defaultValue="FIZIKI">
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_FORMAT_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field name="role" label="Etkinlikteki rolünüz" required error={state.errors?.role}>
            <Select name="role" defaultValue="KATILIMCI">
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_ROLE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="externalUrl" label="Etkinlik bağlantısı (opsiyonel)" error={state.errors?.externalUrl}>
            <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" />
          </Field>

          <Field name="summary" label="Etkinlik açıklaması" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={5} maxLength={5000} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
