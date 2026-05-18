"use client";

import { useActionState, useEffect, useRef } from "react";
import { AlertCircle, Loader2, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { replyToDiscussion, type ForumFormState } from "./actions";

const INITIAL: ForumFormState = { ok: true };

export function ReplyForm({ discussionId }: { discussionId: string }) {
  const [state, action, pending] = useActionState(replyToDiscussion, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const previousPendingRef = useRef(false);

  // Başarılı submit sonrası textarea'yı sıfırla.
  useEffect(() => {
    if (previousPendingRef.current && !pending && state.ok && !state.errors && !state.message) {
      formRef.current?.reset();
    }
    previousPendingRef.current = pending;
  }, [pending, state]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="discussionId" value={discussionId} />

      {!state.ok && state.message ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Field name="body" label="Yanıtınız" required error={state.errors?.body}>
        <Textarea
          id="body"
          name="body"
          rows={4}
          required
          maxLength={10_000}
          placeholder="Yanıtınızı yazın…"
        />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Gönderiliyor…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Yanıt gönder
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
