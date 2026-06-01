"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { GROUP_NOTE_KIND_LABELS } from "@/lib/constants";
import { createGroupNote, type GroupNoteFormState } from "./actions";

type NoteKind = keyof typeof GROUP_NOTE_KIND_LABELS;

const INITIAL: GroupNoteFormState = { ok: true };
type GroupNoteAction = (prev: GroupNoteFormState, fd: FormData) => Promise<GroupNoteFormState>;
type GroupNoteDefaults = {
  kind: NoteKind;
  title: string;
  body: string;
  scope: "GENERAL" | "GROUP";
  groupId: string | null;
};

export function GroupNoteForm({
  allowedKinds,
  defaultKind,
  isAdvisorOrAdmin,
  groups,
  defaultGroupId,
  defaults,
  action: actionFn = createGroupNote,
  cancelHref = "/calisma-grubum?tab=notlar",
  submitLabel = "Notu kaydet",
}: {
  allowedKinds: NoteKind[];
  defaultKind: NoteKind;
  isAdvisorOrAdmin: boolean;
  groups: { id: string; name: string }[];
  defaultGroupId: string | null;
  defaults?: GroupNoteDefaults;
  action?: GroupNoteAction;
  cancelHref?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);
  const [scope, setScope] = useState<"GENERAL" | "GROUP">(defaults?.scope ?? "GROUP");
  const singleKind = allowedKinds.length === 1;

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

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="kind" label="Not türü" required error={state.errors?.kind}>
              {singleKind ? (
                <div className="flex h-10 items-center rounded-md border px-3 text-sm">
                  <input type="hidden" name="kind" value={defaults?.kind ?? defaultKind} />
                  <Badge variant="secondary">{GROUP_NOTE_KIND_LABELS[defaults?.kind ?? defaultKind]}</Badge>
                </div>
              ) : (
                <Select name="kind" defaultValue={defaults?.kind ?? defaultKind}>
                  <SelectTrigger id="kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedKinds.map((k) => (
                      <SelectItem key={k} value={k}>
                        {GROUP_NOTE_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            {isAdvisorOrAdmin && (
              <>
                <Field name="scope" label="Not Kapsamı" required error={state.errors?.scope}>
                  <Select
                    name="scope"
                    value={scope}
                    onValueChange={(val) => setScope(val as "GENERAL" | "GROUP")}
                  >
                    <SelectTrigger id="scope">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">Genel Bildirim</SelectItem>
                      <SelectItem value="GROUP">Çalışma Grubu Bildirimi</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {scope === "GROUP" && (
                  <Field name="groupId" label="Çalışma Grubu" required error={state.errors?.groupId}>
                    <Select name="groupId" defaultValue={defaults?.groupId ?? defaultGroupId ?? undefined}>
                      <SelectTrigger id="groupId">
                        <SelectValue placeholder="Grup Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </>
            )}

            <Field name="title" label="Konu" required error={state.errors?.title}>
              <Input id="title" name="title" required maxLength={200} defaultValue={defaults?.title} />
            </Field>

            <Field name="body" label="Açıklama" required error={state.errors?.body} className="md:col-span-2">
              <Textarea id="body" name="body" rows={6} required maxLength={5000} defaultValue={defaults?.body} />
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Resim / Belge Ekle</p>
            <AttachmentInput disabled={pending} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href={cancelHref}>Vazgeç</Link>
            </Button>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor…
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
