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
import { APPLICANT_ROLE_LABELS, MEMBER_FUNCTION_LABELS } from "@/lib/constants";
import { createProjectApplication, type RecordFormState } from "./actions";
import { FormShell } from "./form-shell";
import { FundTypeFields } from "./fund-select";

const INITIAL: RecordFormState = { ok: true };

export function ProjectApplicationForm() {
  const [state, action, pending] = useActionState(createProjectApplication, INITIAL);

  return (
    <form action={action}>
      <FormShell state={state} pending={pending}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="projectName" label="Proje başlığı" required error={state.errors?.projectName} className="md:col-span-2">
            <Input id="projectName" name="projectName" required maxLength={200} />
          </Field>

          <FundTypeFields errors={state.errors} />

          <Field name="grantProvider" label="Hibe sağlayıcısı" hint="Kurumun tam adı ve varsa kısaltması." error={state.errors?.grantProvider}>
            <Input id="grantProvider" name="grantProvider" maxLength={200} />
          </Field>
          <Field name="programName" label="Program adı" hint="Programın tam adı ve varsa kısaltması." error={state.errors?.programName}>
            <Input id="programName" name="programName" maxLength={200} />
          </Field>

          <Field name="applicantOrg" label="İlgili kurum / kuruluş" error={state.errors?.applicantOrg}>
            <Input id="applicantOrg" name="applicantOrg" maxLength={200} />
          </Field>
          <Field name="applicantRole" label="İlgili kurumun projedeki rolü" error={state.errors?.applicantRole}>
            <Select name="applicantRole">
              <SelectTrigger id="applicantRole">
                <SelectValue placeholder="Seçiniz" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPLICANT_ROLE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field name="budget" label="Proje bütçesi" hint="Sayısal değer (₺)" error={state.errors?.budget}>
            <Input id="budget" name="budget" inputMode="decimal" placeholder="150000" />
          </Field>
          <Field
            name="requestedSupport"
            label="Destek miktarı"
            hint="Talep edilen destek (₺)"
            error={state.errors?.requestedSupport}
          >
            <Input id="requestedSupport" name="requestedSupport" inputMode="decimal" placeholder="100000" />
          </Field>

          <Field name="applicationDate" label="Başvuru tarihi" error={state.errors?.applicationDate}>
            <Input id="applicationDate" name="applicationDate" type="date" />
          </Field>
          <Field name="memberFunction" label="DFT üyesinin fonksiyonu" required error={state.errors?.memberFunction}>
            <Select name="memberFunction" defaultValue="BIREYSEL">
              <SelectTrigger id="memberFunction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MEMBER_FUNCTION_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            name="notes"
            label="Proje özeti"
            hint="500 kelimeyi aşmayacak şekilde özet."
            error={state.errors?.notes}
            className="md:col-span-2"
          >
            <Textarea id="notes" name="notes" maxLength={5000} rows={5} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
