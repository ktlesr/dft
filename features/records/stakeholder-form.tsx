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
import { STAKEHOLDER_KIND_LABELS } from "@/lib/constants";
import { createStakeholder, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

type StakeholderDefaults = {
  fullName: string;
  positionTitle: string | null;
  kind: string;
  organization: string | null;
  linkedinUrl: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  tags: string[];
  description: string | null;
};

type RecordAction = (prev: RecordFormState, fd: FormData) => Promise<RecordFormState>;

export function StakeholderForm({
  defaults,
  action: actionFn = createStakeholder,
  cancelHref,
  submitLabel,
}: {
  defaults?: StakeholderDefaults;
  action?: RecordAction;
  cancelHref?: string;
  submitLabel?: string;
} = {}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} cancelHref={cancelHref} submitLabel={submitLabel} attachmentsLabel="İlgili belgeler (opsiyonel)">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="fullName" label="Adı Soyadı" required error={state.errors?.fullName}>
            <Input id="fullName" name="fullName" required maxLength={200} defaultValue={defaults?.fullName} />
          </Field>
          <Field name="positionTitle" label="Unvanı" error={state.errors?.positionTitle}>
            <Input id="positionTitle" name="positionTitle" maxLength={200} defaultValue={defaults?.positionTitle ?? ""} />
          </Field>

          <Field name="kind" label="Paydaş türü" required error={state.errors?.kind}>
            <Select name="kind" defaultValue={defaults?.kind ?? "YERLI"}>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STAKEHOLDER_KIND_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="organization" label="Kuruluş" error={state.errors?.organization}>
            <Input id="organization" name="organization" maxLength={200} defaultValue={defaults?.organization ?? ""} />
          </Field>

          <Field name="linkedinUrl" label="LinkedIn adresi" error={state.errors?.linkedinUrl}>
            <Input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={defaults?.linkedinUrl ?? ""} placeholder="https://www.linkedin.com/in/…" />
          </Field>
          <Field name="email" label="E-posta adresi" error={state.errors?.email}>
            <Input id="email" name="email" type="email" maxLength={254} defaultValue={defaults?.email ?? ""} />
          </Field>

          <Field name="city" label="Şehir" error={state.errors?.city}>
            <Input id="city" name="city" maxLength={120} defaultValue={defaults?.city ?? ""} />
          </Field>
          <Field name="country" label="Ülke" error={state.errors?.country}>
            <Input id="country" name="country" maxLength={120} defaultValue={defaults?.country ?? ""} />
          </Field>

          <Field name="tags" label="Etiketler" hint="Virgül veya Enter ile ekleyin. En fazla 20." error={state.errors?.tags} className="md:col-span-2">
            <TagInput name="tags" defaultValue={defaults?.tags} placeholder="örn. ar-ge, dijital tarım" />
          </Field>

          <Field name="description" label="Açıklama" error={state.errors?.description} className="md:col-span-2">
            <Textarea id="description" name="description" rows={5} maxLength={5000} defaultValue={defaults?.description ?? ""} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
