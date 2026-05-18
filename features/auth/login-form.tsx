"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type FormState } from "./actions";
import { FieldError } from "./field-error";

const INITIAL: FormState = { ok: true };

export function LoginForm({ banner }: { banner?: "dogrulandi" | "dogrulama-hata" | null }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);
  const [showPassword, setShowPassword] = useState(false);

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
          <Label htmlFor="email">Kullanıcı adı</Label>
          <Input
            id="email"
            name="email"
            type="text"
            autoComplete="username"
            required
            placeholder="ad.soyad"
            aria-invalid={!!state.errors?.email}
            spellCheck={false}
            autoCapitalize="none"
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
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              aria-invalid={!!state.errors?.password}
              className="pr-10"
            />
            <button
              type="button"
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <FieldError messages={state.errors?.password} />
        </div>
        <Button type="submit" className="w-full" variant="brand" disabled={pending}>
          {pending ? "Giriş yapılıyor…" : "Giriş yap"}
        </Button>
      </form>
    </div>
  );
}
