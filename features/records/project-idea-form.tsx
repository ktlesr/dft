"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { createProjectIdea, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function ProjectIdeaForm() {
  const [state, action, pending] = useActionState(createProjectIdea, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="title" label="Proje başlığı" required error={state.errors?.title} className="md:col-span-2">
            <Input id="title" name="title" required maxLength={200} placeholder="Projeniz için öngördüğünüz kısa başlık" />
          </Field>

          <Field name="grantProvider" label="İlgili / potansiyel hibe sağlayıcısı" error={state.errors?.grantProvider}>
            <Input id="grantProvider" name="grantProvider" maxLength={200} />
          </Field>
          <Field name="potentialProgram" label="İlgili / potansiyel program" error={state.errors?.potentialProgram}>
            <Input id="potentialProgram" name="potentialProgram" maxLength={150} />
          </Field>

          <Field name="budget" label="Proje bütçesi" hint="Sayısal değer (₺)" error={state.errors?.budget} className="md:col-span-2">
            <Input id="budget" name="budget" inputMode="decimal" placeholder="150000" />
          </Field>

          <Field
            name="summary"
            label="Proje özeti"
            hint="500 kelimeyi aşmayacak şekilde özet ve uygulama yeri / potansiyel uygulayıcılar."
            error={state.errors?.summary}
            className="md:col-span-2"
          >
            <Textarea id="summary" name="summary" rows={6} maxLength={5000} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
