"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotAction, type FormState } from "./actions";
import { FieldError } from "./field-error";

const INITIAL: FormState = { ok: true };

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(forgotAction, INITIAL);
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

      <form action={formAction} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            aria-invalid={!!state.errors?.email}
          />
          <FieldError messages={state.errors?.email} />
        </div>
        <Button variant="brand" className="w-full" type="submit" disabled={pending}>
          {pending ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}
        </Button>
      </form>
    </div>
  );
}
