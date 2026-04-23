"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { updateProfile, type ProfileFormState } from "./actions";

const INITIAL: ProfileFormState = { ok: true };

type Defaults = {
  name: string;
  title: string;
  position: string;
  organization: string;
  phone: string;
  bio: string;
  expertise: string;
};

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, action, pending] = useActionState(updateProfile, INITIAL);

  return (
    <form action={action} className="space-y-5">
      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          {state.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field name="name" label="Ad Soyad" required error={state.errors?.name}>
          <Input id="name" name="name" required maxLength={100} defaultValue={defaults.name} />
        </Field>
        <Field name="title" label="Unvan" error={state.errors?.title}>
          <Input id="title" name="title" maxLength={60} placeholder="Dr. / Prof. / Mühendis" defaultValue={defaults.title} />
        </Field>
        <Field name="position" label="Görev" error={state.errors?.position}>
          <Input id="position" name="position" maxLength={150} defaultValue={defaults.position} />
        </Field>
        <Field name="organization" label="Kurum" error={state.errors?.organization}>
          <Input id="organization" name="organization" maxLength={150} defaultValue={defaults.organization} />
        </Field>
        <Field name="phone" label="Telefon" error={state.errors?.phone}>
          <Input id="phone" name="phone" maxLength={30} defaultValue={defaults.phone} />
        </Field>
        <Field
          name="expertise"
          label="Uzmanlık alanları"
          hint="Virgülle ayırın. En fazla 20."
          error={state.errors?.expertise}
        >
          <Input id="expertise" name="expertise" defaultValue={defaults.expertise} placeholder="örn. veri yönetişimi, AB programları" />
        </Field>
        <Field name="bio" label="Kısa özgeçmiş" error={state.errors?.bio} className="md:col-span-2">
          <Textarea id="bio" name="bio" rows={4} maxLength={2000} defaultValue={defaults.bio} />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Kaydediliyor…
            </>
          ) : (
            "Kaydet"
          )}
        </Button>
      </div>
    </form>
  );
}
