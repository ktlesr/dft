"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signupAction, type FormState } from "./actions";
import { FieldError } from "./field-error";
import { GoogleSignInButton } from "./google-signin-button";

const INITIAL: FormState = { ok: true };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, INITIAL);
  const success = state.ok && !!state.message;

  if (success) {
    return (
      <Alert variant="success">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!state.ok && state.message ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-4" action={formAction} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Ad Soyad</Label>
            <Input
              id="name"
              name="name"
              required
              autoComplete="name"
              aria-invalid={!!state.errors?.name}
            />
            <FieldError messages={state.errors?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization">Kurum (opsiyonel)</Label>
            <Input
              id="organization"
              name="organization"
              autoComplete="organization"
              aria-invalid={!!state.errors?.organization}
            />
            <FieldError messages={state.errors?.organization} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" aria-invalid={!!state.errors?.email} />
          <FieldError messages={state.errors?.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
            aria-invalid={!!state.errors?.password}
          />
          <FieldError messages={state.errors?.password} />
          <p className="text-[11px] text-muted-foreground">
            En az 10 karakter · büyük-küçük harf, rakam ve bir özel karakter içermeli.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Şifre (tekrar)</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            aria-invalid={!!state.errors?.confirmPassword}
          />
          <FieldError messages={state.errors?.confirmPassword} />
        </div>

        <Button type="submit" className="w-full" variant="brand" disabled={pending}>
          {pending ? "Gönderiliyor…" : "Başvuru yap"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          Başvurunuz yönetici onayına sunulur. Onay sonrası portala erişebilirsiniz.
        </p>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">veya</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton label="Google ile üye ol" disabled={pending} />
      <p className="text-center text-[11px] text-muted-foreground">
        Google ile kayıt olan hesaplar da yönetici onayıyla aktifleşir.
      </p>
    </div>
  );
}
