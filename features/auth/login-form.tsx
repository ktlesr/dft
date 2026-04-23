"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type FormState } from "./actions";
import { FieldError } from "./field-error";

const INITIAL: FormState = { ok: true };

export function LoginForm({ banner }: { banner?: "dogrulandi" | "dogrulama-hata" | null }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <div className="space-y-4">
      {banner === "dogrulandi" ? (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            E-posta adresiniz doğrulandı. Yönetici onayı sonrası portala erişebilirsiniz.
          </AlertDescription>
        </Alert>
      ) : null}
      {banner === "dogrulama-hata" ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Doğrulama bağlantısı geçersiz veya süresi dolmuş.</AlertDescription>
        </Alert>
      ) : null}

      {!state.ok && state.message ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-4" action={formAction} noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-posta</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="ad.soyad@kurum.tr"
            aria-invalid={!!state.errors?.email}
          />
          <FieldError messages={state.errors?.email} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Şifre</Label>
            <Link href="/sifremi-unuttum" className="text-xs text-muted-foreground hover:text-foreground">
              Şifremi unuttum
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={!!state.errors?.password}
          />
          <FieldError messages={state.errors?.password} />
        </div>
        <Button type="submit" className="w-full" variant="brand" disabled={pending}>
          {pending ? "Giriş yapılıyor…" : "Giriş yap"}
        </Button>
      </form>
    </div>
  );
}
