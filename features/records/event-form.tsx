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

type EventDefaults = {
  name: string;
  organizer: string | null;
  date: string;
  endAt: string;
  kind: string | null;
  format: string | null;
  role: string | null;
  externalUrl: string | null;
  summary: string | null;
};

type RecordAction = (prev: RecordFormState, fd: FormData) => Promise<RecordFormState>;

export function EventForm({
  defaults,
  action: actionFn = createEventRecord,
  cancelHref,
  submitLabel,
}: {
  defaults?: EventDefaults;
  action?: RecordAction;
  cancelHref?: string;
  submitLabel?: string;
} = {}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} cancelHref={cancelHref} submitLabel={submitLabel} attachmentsLabel="Etkinlikle ilgili haber, görsel vb. içerikleri yükleyin">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="name" label="Etkinlik adı" required error={state.errors?.name} className="md:col-span-2">
            <Input id="name" name="name" required maxLength={200} defaultValue={defaults?.name} />
          </Field>

          <Field name="organizer" label="Etkinliği düzenleyen kuruluş" error={state.errors?.organizer}>
            <Input id="organizer" name="organizer" maxLength={200} defaultValue={defaults?.organizer ?? ""} />
          </Field>
          <Field
            name="date"
            label="Etkinlik başlangıcı"
            hint="Tarih ve saat."
            required
            error={state.errors?.date}
          >
            <Input id="date" name="date" type="datetime-local" required defaultValue={defaults?.date} />
          </Field>

          <Field
            name="endAt"
            label="Etkinlik bitişi (opsiyonel)"
            hint="Tek günlük / saatlik etkinliklerde boş bırakılabilir."
            error={state.errors?.endAt}
          >
            <Input id="endAt" name="endAt" type="datetime-local" defaultValue={defaults?.endAt} />
          </Field>

          <Field name="kind" label="Etkinlik türü" required error={state.errors?.kind}>
            <Select name="kind" defaultValue={defaults?.kind ?? "AG_KURMA"}>
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
            <Select name="format" defaultValue={defaults?.format ?? "FIZIKI"}>
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
            <Select name="role" defaultValue={defaults?.role ?? "KATILIMCI"}>
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
            <Input id="externalUrl" name="externalUrl" type="url" defaultValue={defaults?.externalUrl ?? ""} placeholder="https://…" />
          </Field>

          <Field name="summary" label="Etkinlik açıklaması" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={5} maxLength={5000} defaultValue={defaults?.summary ?? ""} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
