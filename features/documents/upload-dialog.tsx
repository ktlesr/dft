"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, Loader2, Upload } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { TagInput } from "@/features/shared/tag-input";
import { createDocument, type DocumentFormState } from "./actions";

const INITIAL: DocumentFormState = { ok: true };

type Props = {
  isAdmin: boolean;
  isModerator: boolean;
  hasGroup: boolean;
};

export function UploadDocumentDialog({ isAdmin, isModerator, hasGroup }: Props) {
  const [state, action, pending] = useActionState(createDocument, INITIAL);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!pending && state.ok && !state.message && !state.errors) setOpen(false);
  }, [state, pending]);

  const canOrtak = isAdmin;
  const canGrup = hasGroup && (isAdmin || isModerator);

  const defaultCategory: "ORTAK" | "GRUP" | "UYE_YUKLEMESI" = canOrtak
    ? "ORTAK"
    : canGrup
      ? "GRUP"
      : "UYE_YUKLEMESI";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand">
          <Upload className="h-4 w-4" />
          Belge yükle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Belge yükle</DialogTitle>
          <DialogDescription>
            Kategori, başlık ve en az bir dosya girin. Ortak belge için yönetici, grup belgesi için moderatör yetkisi gerekir.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <Field name="category" label="Kategori" required error={state.errors?.category}>
            <Select name="category" defaultValue={defaultCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canOrtak ? <SelectItem value="ORTAK">Ortak Belge</SelectItem> : null}
                {canGrup ? <SelectItem value="GRUP">Grup Belgesi</SelectItem> : null}
                <SelectItem value="UYE_YUKLEMESI">Üye Yüklemesi</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field name="title" label="Başlık" required error={state.errors?.title}>
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field name="description" label="Açıklama" error={state.errors?.description}>
            <Textarea id="description" name="description" rows={3} maxLength={2000} />
          </Field>

          <Field name="tags" label="Etiketler" hint="Virgül veya Enter ile ekleyin. En fazla 12." error={state.errors?.tags}>
            <TagInput name="tags" placeholder="örn. prosedür, şablon" max={12} />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium">Dosyalar *</p>
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
                  Yükleniyor…
                </>
              ) : (
                "Yükle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
