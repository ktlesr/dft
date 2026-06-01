"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, Loader2, Pencil } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { TagInput } from "@/features/shared/tag-input";
import { updateDocument, type DocumentFormState } from "./actions";

const INITIAL: DocumentFormState = { ok: true };

export function EditDocumentDialog({
  document,
}: {
  document: { id: string; title: string; description: string | null; tags: string[] };
}) {
  const [state, action, pending] = useActionState(updateDocument.bind(null, document.id), INITIAL);
  const [open, setOpen] = React.useState(false);
  const wasPending = React.useRef(false);

  React.useEffect(() => {
    if (wasPending.current && !pending && state.ok && !state.errors && !state.message) setOpen(false);
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Belge düzenle</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {!state.ok && (state.message || state.errors) ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message ?? "Form alanlarını kontrol edin."}</AlertDescription>
            </Alert>
          ) : null}
          <Field name="title" label="Başlık" required error={state.errors?.title}>
            <Input id={`title-${document.id}`} name="title" required maxLength={200} defaultValue={document.title} />
          </Field>
          <Field name="description" label="Açıklama" error={state.errors?.description}>
            <Textarea id={`description-${document.id}`} name="description" rows={3} maxLength={2000} defaultValue={document.description ?? ""} />
          </Field>
          <Field name="tags" label="Etiketler" error={state.errors?.tags}>
            <TagInput name="tags" max={12} defaultValue={document.tags} />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">Yeni ek dosyalar</p>
            <AttachmentInput disabled={pending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                "Belgeyi güncelle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
