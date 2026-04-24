"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2, MailPlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/features/shared/form-field";
import { ROLE_LABELS } from "@/lib/constants";
import { createInvite, type InviteFormState } from "./actions";

const INITIAL: InviteFormState = { ok: true };

export type InviteGroupOption = {
  code: string;
  description: string | null;
};

export function NewInviteForm({ groups }: { groups: InviteGroupOption[] }) {
  const [state, action, pending] = useActionState(createInvite, INITIAL);

  return (
    <form action={action} className="space-y-4">
      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          {state.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            {state.message}
            {state.ok && state.tokenUrl ? (
              <div className="mt-2 rounded bg-background/50 p-2 font-mono text-[11px] break-all">
                {state.tokenUrl}
              </div>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field name="email" label="E-posta" required error={state.errors?.email}>
          <Input id="email" name="email" type="email" required placeholder="ad.soyad@kurum.tr" />
        </Field>
        <Field name="daysValid" label="Geçerlilik (gün)" error={state.errors?.daysValid}>
          <Input id="daysValid" name="daysValid" type="number" min={1} max={60} defaultValue={14} />
        </Field>
      </div>

      <Field name="groupCode" label="Çalışma grubu" error={state.errors?.groupCode}>
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
          Roller (USER her zaman atanır)
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(["MODERATOR", "RAPPORTEUR", "ADMIN"] as const).map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <Checkbox name="roles" value={r} />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Oluşturuluyor…
            </>
          ) : (
            <>
              <MailPlus className="h-4 w-4" />
              Davet oluştur
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
