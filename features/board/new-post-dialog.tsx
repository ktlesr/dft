"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, Loader2, PlusCircle } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { createBoardPost, type BoardFormState } from "./actions";

const INITIAL: BoardFormState = { ok: true };

export function NewBoardPostDialog({
  scope,
  canPin,
  disabled,
}: {
  scope: "GENERAL" | "GROUP";
  canPin: boolean;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(createBoardPost, INITIAL);
  const [open, setOpen] = React.useState(false);

  // Close dialog automatically after a successful submit (no errors, not pending).
  React.useEffect(() => {
    if (!pending && state.ok && !state.errors && !state.message) return;
    if (state.ok && !state.message && !state.errors && !pending) setOpen(false);
  }, [state, pending]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" disabled={disabled}>
          <PlusCircle className="h-4 w-4" />
          Yeni paylaşım
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {scope === "GENERAL" ? "Genel panoya paylaşım" : "Grup panosuna paylaşım"}
          </DialogTitle>
          <DialogDescription>
            {scope === "GENERAL"
              ? "Tüm DFT üyeleri bu paylaşımı görecek."
              : "Yalnızca aynı çalışma grubundaki üyeler görecek."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="scope" value={scope} />

          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Field name="kind" label="Tür" required error={state.errors?.kind}>
              <Select name="kind" defaultValue="NEWS">
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BOARD_KIND_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field name="externalUrl" label="Bağlantı (opsiyonel)" error={state.errors?.externalUrl}>
              <Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" />
            </Field>
          </div>

          <Field name="title" label="Başlık" required error={state.errors?.title}>
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field name="body" label="İçerik" required error={state.errors?.body}>
            <Textarea id="body" name="body" rows={5} required maxLength={10_000} />
          </Field>

          <Field name="tags" label="Etiketler" hint="Virgülle ayırın. En fazla 12." error={state.errors?.tags}>
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

          <div>
            <p className="mb-1.5 text-sm font-medium">Ek dosyalar</p>
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
                  Paylaşılıyor…
                </>
              ) : (
                "Paylaş"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
