"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/features/shared/form-field";
import {
  PROJECT_APPLICATION_KIND_LABELS,
  PROJECT_APPLICATION_STATUS_LABELS,
} from "@/lib/constants";
import { createProjectApplication, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function ProjectApplicationForm() {
  const [state, action, pending] = useActionState(createProjectApplication, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="projectName" label="Proje adı" required error={state.errors?.projectName} className="md:col-span-2">
            <Input id="projectName" name="projectName" required maxLength={200} />
          </Field>

          <Field name="program" label="Program / fon" error={state.errors?.program}>
            <Input id="program" name="program" maxLength={150} />
          </Field>
          <Field name="callName" label="Çağrı adı" error={state.errors?.callName}>
            <Input id="callName" name="callName" maxLength={200} />
          </Field>

          <Field name="applicationDate" label="Başvuru tarihi" error={state.errors?.applicationDate}>
            <Input id="applicationDate" name="applicationDate" type="date" />
          </Field>

          <Field name="status" label="Durum" required error={state.errors?.status}>
            <Select name="status" defaultValue="PLANLANIYOR">
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_APPLICATION_STATUS_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field name="budget" label="Toplam bütçe" hint="Sayısal değer (₺)" error={state.errors?.budget}>
            <Input id="budget" name="budget" inputMode="decimal" placeholder="150000" />
          </Field>
          <Field
            name="requestedSupport"
            label="Talep edilen destek"
            hint="Sayısal değer (₺)"
            error={state.errors?.requestedSupport}
          >
            <Input id="requestedSupport" name="requestedSupport" inputMode="decimal" placeholder="100000" />
          </Field>

          <Field name="kind" label="Başvuru türü" required error={state.errors?.kind} className="md:col-span-2">
            <Select name="kind" defaultValue="BIREYSEL">
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_APPLICATION_KIND_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field name="notes" label="Notlar" error={state.errors?.notes} className="md:col-span-2">
            <Textarea id="notes" name="notes" maxLength={5000} rows={4} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
