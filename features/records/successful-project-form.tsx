"use client";

import { useActionState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { createSuccessfulProject, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";

const INITIAL: RecordFormState = { ok: true };

export function SuccessfulProjectForm() {
  const [state, action, pending] = useActionState(createSuccessfulProject, INITIAL);

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
          <Field name="resultDate" label="Sonuç tarihi" error={state.errors?.resultDate}>
            <Input id="resultDate" name="resultDate" type="date" />
          </Field>

          <Field name="totalBudget" label="Toplam bütçe" hint="Sayısal değer (₺)" error={state.errors?.totalBudget}>
            <Input id="totalBudget" name="totalBudget" inputMode="decimal" />
          </Field>
          <Field name="supportAmount" label="Destek tutarı" hint="Sayısal değer (₺)" error={state.errors?.supportAmount}>
            <Input id="supportAmount" name="supportAmount" inputMode="decimal" />
          </Field>

          <Field name="role" label="Rolünüz" error={state.errors?.role}>
            <Input id="role" name="role" maxLength={120} placeholder="Yürütücü / Araştırmacı / Danışman" />
          </Field>
          <Field name="kind" label="Proje türü" error={state.errors?.kind}>
            <Input id="kind" name="kind" maxLength={120} placeholder="Ar-Ge / İşbirliği / TÜBİTAK 1001" />
          </Field>

          <Field name="resultDocument" label="Sonuç belgesi" error={state.errors?.resultDocument} className="md:col-span-2">
            <Input id="resultDocument" name="resultDocument" maxLength={200} placeholder="Belge numarası veya bağlantı" />
          </Field>

          <Field name="summary" label="Kısa açıklama" error={state.errors?.summary} className="md:col-span-2">
            <Textarea id="summary" name="summary" rows={4} maxLength={3000} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
