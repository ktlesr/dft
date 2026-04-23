"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/shared/form-field";
import { changePassword, type ProfileFormState } from "./actions";

const INITIAL: ProfileFormState = { ok: true };

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changePassword, INITIAL);

  return (
    <form action={action} className="space-y-4">
      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          {state.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field name="currentPassword" label="Mevcut şifre" required error={state.errors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
      </Field>
      <Field name="newPassword" label="Yeni şifre" required error={state.errors?.newPassword}>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          autoComplete="new-password"
          minLength={10}
        />
      </Field>
      <Field name="confirmPassword" label="Yeni şifre (tekrar)" required error={state.errors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        En az 10 karakter · büyük-küçük harf, rakam ve bir özel karakter içermeli.
      </p>
      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Güncelleniyor…
            </>
          ) : (
            "Şifreyi güncelle"
          )}
        </Button>
      </div>
    </form>
  );
}
