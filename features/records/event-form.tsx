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
import { createEventRecord, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

// Stored verbatim in `EventRecord.kind` / `EventRecord.role` (both String).
const EVENT_KINDS = ["Toplantı", "Çalıştay", "Panel", "Konferans"] as const;
const EVENT_ROLES = ["Moderatör", "Panelist"] as const;
const EVENT_FORMATS: { value: "ONLINE" | "FIZIKI"; label: string }[] = [
  { value: "FIZIKI", label: "Fiziki" },
  { value: "ONLINE", label: "Online" },
];

export function EventForm() {
  const [state, action, pending] = useActionState(createEventRecord, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} attachmentsLabel="Görsel / ek dosya yükle">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Etkinlik adı" required error={state.errors?.name} className="md:col-span-2">
            <Input id="name" name="name" required maxLength={200} />
          </Field>

          <Field name="organizer" label="Etkinliği kim organize ediyor" error={state.errors?.organizer} className="md:col-span-2">
            <Input id="organizer" name="organizer" maxLength={200} placeholder="Kurum / kuruluş / ekip" />
          </Field>

          <Field name="kind" label="Etkinlik türü" required error={state.errors?.kind}>
            <Select name="kind" defaultValue="Toplantı">
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="format" label="Etkinlik şekli" required error={state.errors?.format}>
            <Select name="format" defaultValue="FIZIKI">
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_FORMATS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field name="date" label="Tarih" required error={state.errors?.date}>
            <Input id="date" name="date" type="date" required />
          </Field>
          <Field name="location" label="Yer" error={state.errors?.location}>
            <Input id="location" name="location" maxLength={200} />
          </Field>

          <Field name="role" label="Etkinlikteki göreviniz" error={state.errors?.role}>
            <Select name="role" defaultValue="Moderatör">
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="externalUrl" label="Etkinlik bağlantısı (opsiyonel)" error={state.errors?.externalUrl}>
            <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" />
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
