"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2, MessageSquarePlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { createDiscussion, type ForumFormState } from "./actions";

const INITIAL: ForumFormState = { ok: true };

export function NewDiscussionForm({ canPin }: { canPin: boolean }) {
  const [state, action, pending] = useActionState(createDiscussion, INITIAL);

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

          <Field name="title" label="Konu başlığı" required error={state.errors?.title}>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              placeholder="Konuyu özetleyen kısa bir başlık"
            />
          </Field>

          <Field
            name="body"
            label="İçerik"
            required
            hint="Üyelerinizin yorum yapabilmesi için yeterli bağlam sunun."
            error={state.errors?.body}
          >
            <Textarea id="body" name="body" rows={8} required maxLength={20_000} />
          </Field>

          {canPin ? (
            <div className="flex items-center gap-2">
              <Checkbox id="pinned" name="pinned" value="on" />
              <Label htmlFor="pinned" className="text-sm font-normal">
                Üste sabitle
              </Label>
            </div>
          ) : null}

          <div className="flex justify-end border-t pt-5">
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Başlatılıyor…
                </>
              ) : (
                <>
                  <MessageSquarePlus className="h-4 w-4" />
                  Başlat
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
