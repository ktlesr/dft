"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import {
  updateUserProfileByAdmin,
  type UpdateUserFormState,
} from "./user-actions";

const INITIAL: UpdateUserFormState = { ok: true };

export type UserEditDefaults = {
  userId: string;
  name: string;
  organization: string;
  academicTitle: string;
  position: string;
  city: string;
  phone: string;
  bio: string;
};

export function UserEditForm({ defaults }: { defaults: UserEditDefaults }) {
  const [state, action, pending] = useActionState(updateUserProfileByAdmin, INITIAL);

  // Successful submit: useActionState pending == false + ok = true.
  // İlk yüklemeyi başarı olarak göstermemek için errors/message yokluğuna ek
  // koşul: form submit edilmiş olmalı. useActionState bunu doğrudan vermiyor;
  // basit yaklaşım: state'in initial referansından farklılığını izlemek için
  // küçük bir flag tutmak. Şimdilik mesaj/hata yoksa sessiz kalır.

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={defaults.userId} />

      {!state.ok && state.message ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.ok && !pending && !state.errors && !state.message ? null : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Adı Soyadı" required error={state.errors?.name} className="sm:col-span-2">
          <Input id="name" name="name" required maxLength={100} defaultValue={defaults.name} />
        </Field>

        <Field name="organization" label="Kurum / Kuruluş" error={state.errors?.organization}>
          <Input id="organization" name="organization" maxLength={200} defaultValue={defaults.organization} />
        </Field>
        <Field name="academicTitle" label="Akademik Unvan" error={state.errors?.academicTitle}>
          <Input id="academicTitle" name="academicTitle" maxLength={50} defaultValue={defaults.academicTitle} />
        </Field>

        <Field name="position" label="Görevi" error={state.errors?.position} className="sm:col-span-2">
          <Input id="position" name="position" maxLength={200} defaultValue={defaults.position} />
        </Field>

        <Field name="city" label="İl" error={state.errors?.city}>
          <Input id="city" name="city" maxLength={80} defaultValue={defaults.city} />
        </Field>
        <Field name="phone" label="Cep Tel" error={state.errors?.phone}>
          <Input id="phone" name="phone" type="tel" maxLength={40} defaultValue={defaults.phone} />
        </Field>

        <Field name="bio" label="Kısa özgeçmiş" error={state.errors?.bio} className="sm:col-span-2">
          <Textarea id="bio" name="bio" rows={3} maxLength={2000} defaultValue={defaults.bio} />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <Button type="submit" variant="brand" size="sm" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Bilgileri kaydet
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
