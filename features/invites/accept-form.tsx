"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/shared/form-field";
import { acceptInvite, type AcceptInviteState } from "./actions";

const INITIAL: AcceptInviteState = { ok: true };

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInvite, INITIAL);

  if (state.ok && state.message) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Button asChild variant="brand" className="w-full">
          <Link href="/giris">Giriş ekranına git</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      {!state.ok && state.message ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">E-posta</label>
        <Input value={email} readOnly disabled />
      </div>

      <Field name="name" label="Ad Soyad" required error={state.errors?.name}>
        <Input id="name" name="name" required autoComplete="name" />
      </Field>

      <Field name="password" label="Şifre" required error={state.errors?.password}>
        <Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
      </Field>

      <Field name="confirmPassword" label="Şifre (tekrar)" required error={state.errors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
      </Field>

      <p className="text-[11px] text-muted-foreground">
        En az 10 karakter · büyük-küçük harf, rakam ve bir özel karakter içermeli.
      </p>

      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Oluşturuluyor…
          </>
        ) : (
          "Hesabı oluştur"
        )}
      </Button>
    </form>
  );
}
