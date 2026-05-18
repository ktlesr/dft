"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { BOARD_KIND_BY_SCOPE, BOARD_KIND_LABELS } from "@/lib/constants";
import { createBoardPost, type BoardFormState } from "./actions";

const INITIAL: BoardFormState = { ok: true };

/**
 * "Bildirim Ekle" sayfa formu — grup panosu paylaşımı dialog'unun sayfa
 * sürümü. `createBoardPost` server action'ı scope=GROUP ile çağırır;
 * başarılı submit'te /calisma-grubum sayfasına döner.
 */
export function GroupNoticePageForm({ canPin }: { canPin: boolean }) {
  const [state, action, pending] = useActionState(createBoardPost, INITIAL);
  const allowedKinds = BOARD_KIND_BY_SCOPE.GROUP;
  const defaultKind = allowedKinds[0];

  // Başarılı submit sonrası bildirim sekmesine dön.
  const router = useRouter();
  const prevPending = useRef(false);
  useEffect(() => {
    if (
      prevPending.current &&
      !pending &&
      state.ok &&
      !state.errors &&
      !state.message
    ) {
      router.push("/calisma-grubum?tab=bildirimler");
    }
    prevPending.current = pending;
  }, [state, pending, router]);

  return (
    <form action={action}>
      <input type="hidden" name="scope" value="GROUP" />

      <Card>
        <CardContent className="space-y-5 p-6">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="kind" label="Tür" required error={state.errors?.kind}>
              <Select name="kind" defaultValue={defaultKind}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedKinds.map((k) => (
                    <SelectItem key={k} value={k}>
                      {BOARD_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field name="externalUrl" label="Bağlantı (opsiyonel)" error={state.errors?.externalUrl}>
              <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" />
            </Field>
          </div>

          <Field name="title" label="Paylaşım ismi" required error={state.errors?.title}>
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field name="body" label="Paylaşımın içeriği" required error={state.errors?.body}>
            <Textarea id="body" name="body" rows={6} required maxLength={10_000} />
          </Field>

          <Field
            name="tags"
            label="Etiketler"
            hint="Virgülle ayırın. En fazla 12."
            error={state.errors?.tags}
          >
            <Input id="tags" name="tags" placeholder="örn. program, pilot, yayın" />
          </Field>

          {canPin ? (
            <div className="flex items-center gap-2">
              <Checkbox id="pinned" name="pinned" value="on" />
              <Label htmlFor="pinned" className="text-sm font-normal">
                Üste sabitle
              </Label>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Ek dosyalar</p>
            <AttachmentInput disabled={pending} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href="/calisma-grubum">Vazgeç</Link>
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Paylaşılıyor…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Paylaş
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
