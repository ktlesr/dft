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
import { Field } from "@/features/shared/form-field";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { createNotice, type NoticeFormState } from "./actions";

const INITIAL: NoticeFormState = { ok: true };

type GroupOpt = { id: string; code: string; name: string };

type Props = {
  /** Açık olan kanal — varsayılan kapsam ve UI metni için. */
  kanal: "genel" | "grup";
  /** İstemcinin yetkisi: hangi kapsamları açabilir? */
  caps: {
    /** Genel kapsamda yeni bildirim açabilir mi? (Admin) */
    canCreateGeneral: boolean;
    /** Grup kapsamı için açabileceği gruplar. Admin: tüm gruplar; moderatör: kendi grubu. */
    groupsForGroupScope: GroupOpt[];
    /** Üste sabitleme (admin). */
    canPin: boolean;
  };
  /** Moderatör için sabit grup (UI gizleme). */
  fixedGroupId?: string | null;
};

export function NewNoticeDialog({ kanal, caps, fixedGroupId }: Props) {
  const [state, action, pending] = useActionState(createNotice, INITIAL);
  const [open, setOpen] = React.useState(false);

  const canCreateGroup = caps.groupsForGroupScope.length > 0;
  const allowedScopes: ("GENERAL" | "GROUP")[] = [];
  if (caps.canCreateGeneral) allowedScopes.push("GENERAL");
  if (canCreateGroup) allowedScopes.push("GROUP");

  const defaultScope: "GENERAL" | "GROUP" =
    kanal === "genel" && caps.canCreateGeneral
      ? "GENERAL"
      : canCreateGroup
        ? "GROUP"
        : (allowedScopes[0] ?? "GENERAL");

  const [scope, setScope] = React.useState<"GENERAL" | "GROUP">(defaultScope);

  React.useEffect(() => {
    if (!pending && state.ok && !state.errors && !state.message) {
      // form initial state — gerçek bir success sinyaline emin değiliz; useEffect cycle'da
      // gereksiz close olmasın diye burada open'ı kapatmıyoruz. Aşağıdaki dependency
      // değişimi sadece submit sonrası tetiklenir.
    }
  }, [pending, state]);

  // Submit sonrası success → dialog kapansın.
  const prevPending = React.useRef(false);
  React.useEffect(() => {
    if (prevPending.current && !pending && state.ok && !state.errors && !state.message) {
      setOpen(false);
    }
    prevPending.current = pending;
  }, [pending, state]);

  if (allowedScopes.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand" size="sm">
          <PlusCircle className="h-4 w-4" />
          Yeni bildirim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yeni bildirim</DialogTitle>
          <DialogDescription>
            {scope === "GENERAL"
              ? "Tüm DFT üyeleri bu bildirimi görür."
              : "Yalnızca seçilen çalışma grubundaki üyeler görür."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          {/* Kapsam — birden fazla seçenek varsa açılır, yoksa hidden. */}
          {allowedScopes.length > 1 ? (
            <Field name="scope" label="Kapsam" required error={state.errors?.scope}>
              <Select
                name="scope"
                value={scope}
                onValueChange={(v) => setScope(v as "GENERAL" | "GROUP")}
              >
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedScopes.includes("GENERAL") ? (
                    <SelectItem value="GENERAL">Genel bildirim</SelectItem>
                  ) : null}
                  {allowedScopes.includes("GROUP") ? (
                    <SelectItem value="GROUP">Çalışma grubu bildirimi</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="scope" value={scope} />
          )}

          {/* Grup — yalnızca GROUP kapsam aktifken. */}
          {scope === "GROUP" ? (
            fixedGroupId && caps.groupsForGroupScope.length === 1 ? (
              <input type="hidden" name="groupId" value={fixedGroupId} />
            ) : (
              <Field name="groupId" label="Grup" required error={state.errors?.groupId}>
                <Select name="groupId" defaultValue={fixedGroupId ?? undefined}>
                  <SelectTrigger id="groupId">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {caps.groupsForGroupScope.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.code} — {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )
          ) : null}

          <Field name="title" label="Başlık" required error={state.errors?.title}>
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field
            name="eventAt"
            label="Tarih ve saat (opsiyonel)"
            hint="Bildirimin atıfta bulunduğu olay zamanı; toplantı, son başvuru vb. için."
            error={state.errors?.eventAt}
          >
            <Input id="eventAt" name="eventAt" type="datetime-local" />
          </Field>

          <Field name="body" label="İçerik" required error={state.errors?.body}>
            <Textarea id="body" name="body" rows={5} required maxLength={10_000} />
          </Field>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Ek dosyalar (opsiyonel)</p>
            <AttachmentInput disabled={pending} />
          </div>

          {caps.canPin ? (
            <div className="flex items-center gap-2">
              <Checkbox id="pinned" name="pinned" value="on" />
              <Label htmlFor="pinned" className="text-sm font-normal">
                Üste sabitle
              </Label>
            </div>
          ) : null}

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
                "Paylaş"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
