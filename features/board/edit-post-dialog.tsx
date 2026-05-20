"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, Loader2, Pencil, X } from "lucide-react";

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
import { BOARD_KIND_LABELS, BOARD_KIND_BY_SCOPE } from "@/lib/constants";
import { updateBoardPost, type BoardFormState } from "./actions";

const INITIAL: BoardFormState = { ok: true };

type ExistingAttachment = {
  id: string;
  originalName: string;
};

export type EditBoardPostInitial = {
  id: string;
  scope: "GENERAL" | "GROUP";
  kind: keyof typeof BOARD_KIND_LABELS;
  title: string;
  body: string;
  assessment?: string | null;
  tags: string[];
  externalUrl: string | null;
  publishedAt: Date;
  attachments: ExistingAttachment[];
};

function toDateInputValue(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function EditBoardPostDialog({ post }: { post: EditBoardPostInitial }) {
  const [state, action, pending] = useActionState(updateBoardPost, INITIAL);
  const [open, setOpen] = React.useState(false);
  const [removeIds, setRemoveIds] = React.useState<Set<string>>(new Set());
  const allowedKinds = BOARD_KIND_BY_SCOPE[post.scope];

  // Dialog her açıldığında "silinecek dosya" seçimini sıfırla.
  React.useEffect(() => {
    if (open) setRemoveIds(new Set());
  }, [open]);

  const prevPending = React.useRef(false);
  React.useEffect(() => {
    if (
      prevPending.current &&
      !pending &&
      state.ok &&
      !state.errors &&
      !state.message
    ) {
      setOpen(false);
    }
    prevPending.current = pending;
  }, [state, pending]);

  const toggleRemove = (id: string) => {
    setRemoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kayıt düzenle</DialogTitle>
          <DialogDescription>
            Yalnızca yöneticiler geçmiş kayıtları düzenleyebilir. Değişiklik anında yayına girer.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={post.id} />

          {!state.ok && (state.message || state.errors) ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {state.message ?? "Formda eksik veya geçersiz alanlar var. Lütfen kontrol edin."}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <Field name="kind" label="Tür" required error={state.errors?.kind}>
              <Select name="kind" defaultValue={post.kind}>
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

            {post.scope === "GENERAL" ? (
              <Field
                name="publishedAt"
                label="Paylaşım tarihi"
                hint="Boş bırakırsanız mevcut tarih korunur."
                error={state.errors?.publishedAt}
              >
                <Input
                  id="publishedAt"
                  name="publishedAt"
                  type="date"
                  defaultValue={toDateInputValue(new Date(post.publishedAt))}
                />
              </Field>
            ) : (
              <Field name="externalUrl" label="Bağlantı (opsiyonel)" error={state.errors?.externalUrl}>
                <Input
                  id="externalUrl"
                  name="externalUrl"
                  type="url"
                  placeholder="https://…"
                  defaultValue={post.externalUrl ?? ""}
                />
              </Field>
            )}
          </div>

          <Field name="title" label="Paylaşım ismi" required error={state.errors?.title}>
            <Input id="title" name="title" required maxLength={200} defaultValue={post.title} />
          </Field>

          {post.scope === "GENERAL" ? (
            <Field name="externalUrl" label="İlgili bağlantı (opsiyonel)" error={state.errors?.externalUrl}>
              <Input
                id="externalUrl"
                name="externalUrl"
                type="url"
                placeholder="https://…"
                defaultValue={post.externalUrl ?? ""}
              />
            </Field>
          ) : null}

          <Field name="body" label="Paylaşımın içeriği" required error={state.errors?.body}>
            <Textarea id="body" name="body" rows={5} required maxLength={10_000} defaultValue={post.body} />
          </Field>

          {post.scope === "GENERAL" ? (
            <Field
              name="assessment"
              label="Değerlendirme/Yorum"
              hint="Opsiyonel. Yayınlandıktan sonra tüm üyelere gösterilir."
              error={state.errors?.assessment}
            >
              <Textarea
                id="assessment"
                name="assessment"
                rows={4}
                maxLength={10_000}
                defaultValue={post.assessment ?? ""}
              />
            </Field>
          ) : null}

          <Field name="tags" label="Etiketler" hint="Virgül veya Enter ile ekleyin. En fazla 12." error={state.errors?.tags}>
            <TagInput name="tags" placeholder="örn. program, pilot, yayın" max={12} defaultValue={post.tags} />
          </Field>

          {post.attachments.length > 0 ? (
            <div>
              <p className="mb-1.5 text-sm font-medium">Mevcut ek dosyalar</p>
              <ul className="divide-y rounded-md border">
                {post.attachments.map((a) => {
                  const marked = removeIds.has(a.id);
                  return (
                    <li
                      key={a.id}
                      className={`flex items-center gap-3 px-3 py-2 text-sm ${marked ? "bg-destructive/5" : ""}`}
                    >
                      <span className={`min-w-0 flex-1 truncate ${marked ? "line-through text-muted-foreground" : ""}`}>
                        {a.originalName}
                      </span>
                      {marked ? (
                        <input type="hidden" name="removeAttachmentIds" value={a.id} />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => toggleRemove(a.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5" />
                        {marked ? "Geri al" : "Kaldır"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Kaldırılan dosyalar kaydedildiğinde kalıcı olarak silinir.
              </p>
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-sm font-medium">Yeni ek dosya / görsel</p>
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
                "Kaydet"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
