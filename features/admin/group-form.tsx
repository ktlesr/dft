"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import {
  createGroupAction,
  updateGroupAction,
  type GroupFormState,
} from "./group-actions";

const INITIAL: GroupFormState = { ok: true };

type Defaults = {
  id?: string;
  code: string;
  name: string;
  description: string;
};

/**
 * Shared form for creating and updating groups. `mode` switches the
 * underlying server action; the layout is identical either way so the
 * admin flow feels symmetric.
 */
export function GroupForm({
  mode,
  defaults,
}: {
  mode: "create" | "update";
  defaults?: Defaults;
}) {
  const [state, action, pending] = useActionState(
    mode === "create" ? createGroupAction : updateGroupAction,
    INITIAL,
  );

  return (
    <form action={action} className="space-y-5">
      {mode === "update" && defaults?.id ? (
        <input type="hidden" name="id" value={defaults.id} />
      ) : null}

      {state.message ? (
        <Alert variant={state.ok ? "success" : "destructive"}>
          {state.ok ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[160px_1fr]">
        <Field name="code" label="Kod" required error={state.errors?.code}>
          <Input
            id="code"
            name="code"
            required
            maxLength={20}
            autoCapitalize="characters"
            defaultValue={defaults?.code ?? ""}
            placeholder="UAK"
            className="font-mono uppercase"
          />
        </Field>
        <Field name="name" label="Grup adı" required error={state.errors?.name}>
          <Input
            id="name"
            name="name"
            required
            maxLength={150}
            defaultValue={defaults?.name ?? ""}
            placeholder="Uluslararası ve Akademik Koordinasyon"
          />
        </Field>
      </div>

      <Field
        name="description"
        label="Açıklama"
        hint="Opsiyonel. Sidebar ve grup sayfalarında üyelere gösterilir."
        error={state.errors?.description}
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={defaults?.description ?? ""}
        />
      </Field>

      <div className="flex items-center justify-end gap-2 border-t pt-5">
        <Button asChild variant="ghost" disabled={pending}>
          <Link href="/yonetim/gruplar">Vazgeç</Link>
        </Button>
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {mode === "create" ? "Oluşturuluyor…" : "Kaydediliyor…"}
            </>
          ) : mode === "create" ? (
            "Grubu oluştur"
          ) : (
            "Değişiklikleri kaydet"
          )}
        </Button>
      </div>
    </form>
  );
}
