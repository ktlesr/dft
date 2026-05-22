"use client";

import * as React from "react";
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
import { createSuccessfulProject, type RecordFormState } from "./actions";
import { CurrencyInput, CurrencySelect } from "./currency-input";
import type { CurrencyCode } from "./schemas";
import { FormShell } from "./form-shell";
import { FundTypeFields } from "./fund-select";

const INITIAL: RecordFormState = { ok: true };

type SuccessfulProjectDefaults = {
  projectName: string;
  fundCategory: string | null;
  fundSubType: string | null;
  grantProvider: string | null;
  programName: string | null;
  applicantOrg: string | null;
  applicantRole: string | null;
  totalBudget: number;
  supportAmount: number;
  currency: CurrencyCode;
  applicationDate: string;
  acceptanceDate: string;
  memberFunction: string | null;
  summary: string | null;
};

type RecordAction = (prev: RecordFormState, fd: FormData) => Promise<RecordFormState>;

export function SuccessfulProjectForm({
  defaults,
  action: actionFn = createSuccessfulProject,
  cancelHref,
  submitLabel,
}: {
  defaults?: SuccessfulProjectDefaults;
  action?: RecordAction;
  cancelHref?: string;
  submitLabel?: string;
} = {}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);
  const [currency, setCurrency] = React.useState<CurrencyCode>(defaults?.currency ?? "TRY");

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} cancelHref={cancelHref} submitLabel={submitLabel} attachmentsLabel="Proje kabul belgesi / ek dosyalar">
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="projectName" label="Proje başlığı" required error={state.errors?.projectName} className="md:col-span-2">
            <Input id="projectName" name="projectName" required maxLength={200} defaultValue={defaults?.projectName} />
          </Field>

          <FundTypeFields errors={state.errors} defaultCategory={defaults?.fundCategory} defaultSubType={defaults?.fundSubType} />

          <Field name="grantProvider" label="Hibe sağlayıcısı" hint="Kurumun tam adı ve varsa kısaltması." error={state.errors?.grantProvider}>
            <Input id="grantProvider" name="grantProvider" maxLength={200} defaultValue={defaults?.grantProvider ?? ""} />
          </Field>
          <Field name="programName" label="Program adı" hint="Programın tam adı ve varsa kısaltması." error={state.errors?.programName}>
            <Input id="programName" name="programName" maxLength={200} defaultValue={defaults?.programName ?? ""} />
          </Field>

          <Field name="applicantOrg" label="İlgili kurum / kuruluş" error={state.errors?.applicantOrg}>
            <Input id="applicantOrg" name="applicantOrg" maxLength={200} defaultValue={defaults?.applicantOrg ?? ""} />
          </Field>
          <Field name="applicantRole" label="İlgili kurumun projedeki rolü" error={state.errors?.applicantRole}>
            <Select name="applicantRole" defaultValue={defaults?.applicantRole ?? undefined}>
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

          <Field name="totalBudget" label="Proje bütçesi" hint="Tutarı yazdıkça otomatik biçimlendirilir." error={state.errors?.totalBudget}>
            <div className="flex gap-2">
              <CurrencyInput
                id="totalBudget"
                name="totalBudget"
                placeholder="150.000"
                currency={currency}
                defaultValue={defaults?.totalBudget ?? 0}
                className="flex-1"
              />
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>
          </Field>
          <Field name="supportAmount" label="Destek miktarı" hint="Talep edilen destek." error={state.errors?.supportAmount}>
            <CurrencyInput
              id="supportAmount"
              name="supportAmount"
              placeholder="100.000"
              currency={currency}
              defaultValue={defaults?.supportAmount ?? 0}
            />
          </Field>

          <Field name="applicationDate" label="Başvuru tarihi" error={state.errors?.applicationDate}>
            <Input id="applicationDate" name="applicationDate" type="date" defaultValue={defaults?.applicationDate} />
          </Field>
          <Field name="acceptanceDate" label="Proje kabul tarihi" error={state.errors?.acceptanceDate}>
            <Input id="acceptanceDate" name="acceptanceDate" type="date" defaultValue={defaults?.acceptanceDate} />
          </Field>

          <Field name="memberFunction" label="DFT üyesinin fonksiyonu" required error={state.errors?.memberFunction} className="md:col-span-2">
            <Select name="memberFunction" defaultValue={defaults?.memberFunction ?? "BIREYSEL"}>
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
            name="summary"
            label="Proje özeti"
            hint="500 kelimeyi aşmayacak şekilde özet."
            error={state.errors?.summary}
            className="md:col-span-2"
          >
            <Textarea id="summary" name="summary" rows={5} maxLength={5000} defaultValue={defaults?.summary ?? ""} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
