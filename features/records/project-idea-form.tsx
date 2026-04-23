"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/features/shared/form-field";
import { PROJECT_IDEA_STAGE_LABELS } from "@/lib/constants";
import { createProjectIdea, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function ProjectIdeaForm() {
  const [state, action, pending] = useActionState(createProjectIdea, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="Fikir / hazırlık başlığı" required error={state.errors?.title} className="md:col-span-2">
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field name="potentialProgram" label="İlgili / potansiyel program" error={state.errors?.potentialProgram}>
            <Input id="potentialProgram" name="potentialProgram" maxLength={150} />
          </Field>
          <Field name="callTopic" label="Çağrı / konu başlığı" error={state.errors?.callTopic}>
            <Input id="callTopic" name="callTopic" maxLength={200} />
          </Field>

          <Field name="stage" label="Fikir aşaması" required error={state.errors?.stage}>
            <Select name="stage" defaultValue="FIKIR">
              <SelectTrigger id="stage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_IDEA_STAGE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field name="targetDate" label="Hedef tarih" error={state.errors?.targetDate}>
            <Input id="targetDate" name="targetDate" type="date" />
          </Field>

          <Field name="potentialPartners" label="Potansiyel ortaklar" error={state.errors?.potentialPartners} className="md:col-span-2">
            <Input id="potentialPartners" name="potentialPartners" maxLength={500} placeholder="Kurum / kişi adları" />
          </Field>

          <Field name="summary" label="Kısa açıklama" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={4} maxLength={3000} />
          </Field>

          <Field name="nextStep" label="Sonraki adım" error={state.errors?.nextStep} className="md:col-span-2">
            <Input id="nextStep" name="nextStep" maxLength={500} />
          </Field>

          <Field name="notes" label="Notlar" error={state.errors?.notes} className="md:col-span-2">
            <Textarea id="notes" name="notes" rows={3} maxLength={3000} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
