"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetAction, type FormState } from "./actions";
import { FieldError } from "./field-error";

const INITIAL: FormState = { ok: true };

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetAction, INITIAL);

  if (state.ok && state.message) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Button asChild variant="brand" className="w-full">
          <Link href="/giris">Giriş yap</Link>
        </Button>
      </div>
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

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="token" value={token} />
        <div className="space-y-2">
          <Label htmlFor="password">Yeni şifre</Label>
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
          <Label htmlFor="confirmPassword">Yeni şifre (tekrar)</Label>
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
        <Button variant="brand" className="w-full" type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Şifreyi güncelle"}
        </Button>
      </form>
    </div>
  );
}
