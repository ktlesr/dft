"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, MessageSquarePlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { createDiscussion, type ForumFormState } from "./actions";

const INITIAL: ForumFormState = { ok: true };

type ForumAction = (prev: ForumFormState, fd: FormData) => Promise<ForumFormState>;

export function NewDiscussionForm({
  canPin,
  defaults,
  action: actionFn = createDiscussion,
  cancelHref,
  submitLabel = "Başlat",
}: {
  canPin: boolean;
  defaults?: { title: string; body: string; pinned: boolean };
  action?: ForumAction;
  cancelHref?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);

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

          <Field name="title" label="Başlık" required error={state.errors?.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="Konuyu özetleyen kısa bir başlık"
              defaultValue={defaults?.title}
            />
          </Field>

          <Field
            name="body"
            label="İçerik"
            required
            hint="Üyelerinizin yorum yapabilmesi için yeterli bağlam sunun."
            error={state.errors?.body}
          >
            <Textarea id="body" name="body" rows={8} required maxLength={20_000} defaultValue={defaults?.body} />
          </Field>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Ek dosyalar (opsiyonel)</p>
            <AttachmentInput />
          </div>

          {canPin ? (
            <div className="flex items-center gap-2">
              <Checkbox id="pinned" name="pinned" value="on" defaultChecked={defaults?.pinned} />
              <Label htmlFor="pinned" className="text-sm font-normal">
                Üste sabitle
              </Label>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t pt-5">
            {cancelHref ? (
              <Button asChild variant="ghost">
                <Link href={cancelHref}>Vazgeç</Link>
              </Button>
            ) : null}
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Başlatılıyor…
                </>
              ) : (
                <>
                  <MessageSquarePlus className="h-4 w-4" />
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
