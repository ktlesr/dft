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
import { createProjectApplication, type RecordFormState } from "./actions";
import { CurrencyInput, CurrencySelect } from "./currency-input";
import { PROJECT_APPLICATION_PHASES, type CurrencyCode } from "./schemas";
import { FormShell } from "./form-shell";
import { FundTypeFields } from "./fund-select";

const INITIAL: RecordFormState = { ok: true };

type ProjectApplicationDefaults = {
  projectName: string;
  fundCategory: string | null;
  fundSubType: string | null;
  grantProvider: string | null;
  programName: string | null;
  applicantOrg: string | null;
  applicantRole: string | null;
  budget: number;
  requestedSupport: number;
  currency: CurrencyCode;
  applicationDate: string;
  isPhased: boolean;
  applicationPhase: string | null;
  memberFunction: string | null;
  notes: string | null;
};

type RecordAction = (prev: RecordFormState, fd: FormData) => Promise<RecordFormState>;

export function ProjectApplicationForm({
  defaults,
  action: actionFn = createProjectApplication,
  cancelHref,
  submitLabel,
}: {
  defaults?: ProjectApplicationDefaults;
  action?: RecordAction;
  cancelHref?: string;
  submitLabel?: string;
} = {}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);
  const [currency, setCurrency] = React.useState<CurrencyCode>(defaults?.currency ?? "TRY");
  const [isPhased, setIsPhased] = React.useState<"EVET" | "HAYIR">(defaults?.isPhased ? "EVET" : "HAYIR");

  return (
    <form action={action}>
      <FormShell state={state} pending={pending} cancelHref={cancelHref} submitLabel={submitLabel}>
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

          <Field name="budget" label="Proje bütçesi" hint="Tutarı yazdıkça otomatik biçimlendirilir." error={state.errors?.budget}>
            <div className="flex gap-2">
              <CurrencyInput
                id="budget"
                name="budget"
                placeholder="150.000"
                currency={currency}
                defaultValue={defaults?.budget ?? 0}
                className="flex-1"
              />
              <CurrencySelect value={currency} onChange={setCurrency} />
            </div>
          </Field>
          <Field
            name="requestedSupport"
            label="Destek miktarı"
            hint="Talep edilen destek."
            error={state.errors?.requestedSupport}
          >
            <CurrencyInput
              id="requestedSupport"
              name="requestedSupport"
              placeholder="100.000"
              currency={currency}
              defaultValue={defaults?.requestedSupport ?? 0}
            />
          </Field>

          <Field name="applicationDate" label="Başvuru tarihi" error={state.errors?.applicationDate}>
            <Input id="applicationDate" name="applicationDate" type="date" defaultValue={defaults?.applicationDate} />
          </Field>
          <Field
            name="isPhased"
            label="Proje başvurusu aşamalı mı?"
            required
            error={state.errors?.isPhased}
          >
            <Select name="isPhased" value={isPhased} onValueChange={(v) => setIsPhased(v as "EVET" | "HAYIR")}>
              <SelectTrigger id="isPhased">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HAYIR">Hayır</SelectItem>
                <SelectItem value="EVET">Evet</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {isPhased === "EVET" ? (
            <Field name="applicationPhase" label="Aşama" required error={state.errors?.applicationPhase}>
              <Select name="applicationPhase" defaultValue={defaults?.applicationPhase ?? undefined}>
                <SelectTrigger id="applicationPhase">
                  <SelectValue placeholder="Aşama seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROJECT_APPLICATION_PHASES[0]}>1. AŞAMA</SelectItem>
                  <SelectItem value={PROJECT_APPLICATION_PHASES[1]}>2. AŞAMA</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="applicationPhase" value="" />
          )}
          <Field name="memberFunction" label="DFT üyesinin fonksiyonu" required error={state.errors?.memberFunction}>
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
            name="notes"
            label="Proje özeti"
            hint="500 kelimeyi aşmayacak şekilde özet."
            error={state.errors?.notes}
            className="md:col-span-2"
          >
            <Textarea id="notes" name="notes" maxLength={5000} rows={5} defaultValue={defaults?.notes ?? ""} />
          </Field>
        </div>
      </FormShell>
    </form>
  );
}
