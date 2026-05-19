"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/features/shared/form-field";
import { ROLE_LABELS } from "@/lib/constants";
import { createUserByAdmin, type CreateUserFormState } from "./user-actions";

const INITIAL: CreateUserFormState = { ok: true };

export type NewUserGroupOption = {
  code: string;
  description: string | null;
};

/** Generate a human-pronounceable strong password that satisfies the policy. */
function generatePassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?+-";
  const all = lower + upper + digits + symbols;

  const randInt = (max: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0]! % max;
  };
  const pick = (set: string) => set[randInt(set.length)]!;

  // Guarantee one of each class, then fill to policy minimum (10 char).
  const out = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (out.length < 10) out.push(pick(all));
  // Shuffle (Fisher-Yates)
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.join("");
}

export function NewUserForm({ groups }: { groups: NewUserGroupOption[] }) {
  const [state, action, pending] = useActionState(createUserByAdmin, INITIAL);
  const [showPassword, setShowPassword] = React.useState(false);
  const [password, setPassword] = React.useState("");

  return (
    <form action={action}>
      <Card>
        <CardContent className="space-y-5 p-6">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="name" label="Adı Soyadı" required error={state.errors?.name}>
              <Input id="name" name="name" required autoComplete="name" maxLength={100} />
            </Field>
            <Field name="email" label="E-Posta (giriş)" required error={state.errors?.email}>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="off"
                placeholder="ad.soyad@kurum.tr"
              />
            </Field>

            <Field name="organization" label="Kurum / Kuruluş" error={state.errors?.organization}>
              <Input id="organization" name="organization" maxLength={200} />
            </Field>
            <Field
              name="academicTitle"
              label="Akademik Ünvan"
              hint="Örn. Dr., Doç. Dr., Prof. Dr. — opsiyonel."
              error={state.errors?.academicTitle}
            >
              <Input id="academicTitle" name="academicTitle" maxLength={50} />
            </Field>

            <Field name="position" label="Görevi" error={state.errors?.position} className="md:col-span-2">
              <Input id="position" name="position" maxLength={200} placeholder="Örn. AB ve Dış İlişkiler Bürosu Koordinatörü" />
            </Field>

            <Field name="city" label="İl" error={state.errors?.city}>
              <Input id="city" name="city" maxLength={80} />
            </Field>
            <Field name="phone" label="Cep Tel" error={state.errors?.phone}>
              <Input id="phone" name="phone" type="tel" maxLength={40} placeholder="05XX XXX XX XX" />
            </Field>
          </div>

          <Field
            name="password"
            label="Geçici şifre"
            required
            hint="En az 10 karakter · büyük-küçük harf, rakam ve özel karakter. Kullanıcı ilk girişte değiştirebilir."
            error={state.errors?.password}
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  minLength={10}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const p = generatePassword();
                  setPassword(p);
                  setShowPassword(true);
                }}
                className="shrink-0"
                title="Güçlü şifre üret"
              >
                <RefreshCw className="h-4 w-4" />
                Üret
              </Button>
            </div>
          </Field>

          <Field
            name="groupCode"
            label="Çalışma Grubu"
            required
            error={state.errors?.groupCode}
            hint="Grupsuz bırakılırsa kullanıcı grup içeriklerini göremez; ADMIN rolü verilecekse bile grup atamak önerilir."
          >
            <Select name="groupCode" defaultValue="NONE">
              <SelectTrigger id="groupCode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Grup atanmasın</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.code} value={g.code}>
                    {g.code}
                    {g.description ? ` · ${g.description}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Roller
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* USER is the baseline membership — shown always-checked +
                  disabled so admins can see what the account gets and add
                  elevated roles on top. */}
              <label className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <Checkbox checked disabled aria-label="Üye rolü her zaman atanır" />
                <div className="flex flex-col">
                  <span>{ROLE_LABELS.USER}</span>
                  <span className="text-[10px] text-muted-foreground">Her zaman atanır</span>
                </div>
              </label>
              {(["MODERATOR", "RAPPORTEUR", "ADVISOR", "KS", "ADMIN"] as const).map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:border-primary/40"
                >
                  <Checkbox name="extraRoles" value={r} />
                  <span>{ROLE_LABELS[r]}</span>
                </label>
              ))}
            </div>
            <p className="px-1 text-[11px] text-muted-foreground">
              <strong>Üye</strong> portala erişimin temel rolüdür; tüm hesaplara atanır. Üzerine
              ihtiyaca göre <strong>Moderatör</strong> (grup panosu moderasyonu + toplantı
              bildirimi), <strong>Raportör</strong> (tutanak + rapor),{" "}
              <strong>Danışman</strong> (uzman danışmanlık) veya{" "}
              <strong>Kalite Sistemi Yöneticisi</strong> (KS notları) ya da{" "}
              <strong>Yönetici</strong> (tam erişim) ekleyebilirsiniz.
            </p>
          </fieldset>

          <Alert>
            <AlertDescription className="text-xs">
              Hesap anında <strong>ACTIVE</strong> olarak oluşturulur. E-posta ve geçici şifreyi
              kullanıcıya güvenli bir kanaldan (ör. kurum e-postası) iletin. Kullanıcı ilk girişten
              sonra Profil → Güvenlik sekmesinden şifresini değiştirebilir.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href="/yonetim/kullanicilar">Vazgeç</Link>
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Oluşturuluyor…
                </>
              ) : (
                "Kullanıcıyı oluştur"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
