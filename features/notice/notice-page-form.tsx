"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/shared/form-field";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { createNoticeFromPage, type NoticeFormState } from "./actions";

const INITIAL: NoticeFormState = { ok: true };

type GroupOpt = { id: string; code: string; name: string };
type NoticeDefaults = NonNullable<NoticeFormState["values"]>;
type NoticeAction = (prev: NoticeFormState, fd: FormData) => Promise<NoticeFormState>;

function groupLabel(group: GroupOpt): string {
  return group.name.trim().toLowerCase() === group.code.trim().toLowerCase()
    ? group.code
    : `${group.code} - ${group.name}`;
}

export function NoticePageForm({
  isAdmin,
  groups,
  defaultGroupId,
  canPin,
  defaults,
  action: actionFn = createNoticeFromPage,
  cancelHref = "/calisma-grubum?tab=bildirimler",
  submitLabel = "Bildirim ekle",
}: {
  isAdmin: boolean;
  groups: GroupOpt[];
  defaultGroupId: string | null;
  canPin: boolean;
  defaults?: NoticeDefaults;
  action?: NoticeAction;
  cancelHref?: string;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(actionFn, INITIAL);
  const groupOptions = useMemo(() => groups, [groups]);
  const sourceValues = state.values ?? defaults;

  const initialScope: "GENERAL" | "GROUP" =
    sourceValues?.scope === "GROUP" || sourceValues?.scope === "GENERAL"
      ? (sourceValues.scope as "GENERAL" | "GROUP")
      : isAdmin && !defaultGroupId
        ? "GENERAL"
        : "GROUP";

  const initialKind: "MEETING" | "EVENT" | "NEWS" | "OTHER" =
    sourceValues?.kind && ["MEETING", "EVENT", "NEWS", "OTHER"].includes(sourceValues.kind)
      ? (sourceValues.kind as "MEETING" | "EVENT" | "NEWS" | "OTHER")
      : "NEWS";

  const initialGroupId = sourceValues?.groupId ?? defaultGroupId ?? groupOptions[0]?.id ?? "";

  const [scope, setScope] = useState<"GENERAL" | "GROUP">(initialScope);
  const [kind, setKind] = useState<"MEETING" | "EVENT" | "NEWS" | "OTHER">(initialKind);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [title, setTitle] = useState(sourceValues?.title ?? "");
  const [externalUrl, setExternalUrl] = useState(sourceValues?.externalUrl ?? "");
  const [eventStartAt, setEventStartAt] = useState(sourceValues?.eventStartAt ?? "");
  const [eventEndAt, setEventEndAt] = useState(sourceValues?.eventEndAt ?? "");
  const [body, setBody] = useState(sourceValues?.body ?? "");
  const submittedGroupId = groupId || defaultGroupId || groupOptions[0]?.id || "";

  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !state.values) return;
    hydrated.current = true;
    if (state.values.scope === "GROUP" || state.values.scope === "GENERAL") {
      setScope(state.values.scope);
    }
    if (state.values.kind && ["MEETING", "EVENT", "NEWS", "OTHER"].includes(state.values.kind)) {
      setKind(state.values.kind as "MEETING" | "EVENT" | "NEWS" | "OTHER");
    }
    setGroupId(state.values.groupId ?? initialGroupId);
    setTitle(state.values.title ?? "");
    setExternalUrl(state.values.externalUrl ?? "");
    setEventStartAt(state.values.eventStartAt ?? "");
    setEventEndAt(state.values.eventEndAt ?? "");
    setBody(state.values.body ?? "");
  }, [initialGroupId, state.values]);

  useEffect(() => {
    const firstGroupId = groupOptions[0]?.id;
    if (!groupId && firstGroupId && (isAdmin ? scope === "GROUP" : true)) {
      setGroupId(firstGroupId);
    }
  }, [groupId, groupOptions, isAdmin, scope]);

  return (
    <form action={action}>
      {!isAdmin ? <input type="hidden" name="scope" value="GROUP" /> : null}
      {!isAdmin ? <input type="hidden" name="groupId" value={submittedGroupId} /> : null}
      {isAdmin && scope === "GROUP" ? <input type="hidden" name="groupId" value={submittedGroupId} /> : null}

      <Card>
        <CardContent className="space-y-5 p-6">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          {isAdmin ? (
            <Field name="scope" label="Kapsam" required error={state.errors?.scope}>
              <Select name="scope" value={scope} onValueChange={(v) => setScope(v as "GENERAL" | "GROUP")}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROUP">Çalışma grubu bildirimi</SelectItem>
                  <SelectItem value="GENERAL">Genel bildirim</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {isAdmin && scope === "GROUP" ? (
            groupOptions.length > 0 ? (
              <Field name="groupId" label="Hedef Grup" required error={state.errors?.groupId}>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger id="groupId">
                    <SelectValue placeholder="Seçiniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {groupLabel(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Alert>
                <AlertDescription>
                  Grup kapsamında bildirim için en az bir grup tanımlı olmalıdır.
                </AlertDescription>
              </Alert>
            )
          ) : null}

          <Field name="title" label="Başlık" required error={state.errors?.title}>
            <Input id="title" name="title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <Field name="kind" label="Bildirim Tipi" required error={state.errors?.kind}>
            <Select name="kind" value={kind} onValueChange={(v) => setKind(v as "MEETING" | "EVENT" | "NEWS" | "OTHER")}>
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEETING">{BOARD_KIND_LABELS.MEETING}</SelectItem>
                <SelectItem value="EVENT">{BOARD_KIND_LABELS.EVENT}</SelectItem>
                <SelectItem value="NEWS">{BOARD_KIND_LABELS.NEWS}</SelectItem>
                <SelectItem value="OTHER">{BOARD_KIND_LABELS.OTHER}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            name="externalUrl"
            label={
              kind === "MEETING"
                ? "Toplantı bağlantısı (opsiyonel)"
                : kind === "EVENT"
                  ? "Etkinlik bağlantısı (opsiyonel)"
                  : kind === "NEWS"
                    ? "Haber bağlantısı (opsiyonel)"
                    : "İlgili bağlantı (opsiyonel)"
            }
            error={state.errors?.externalUrl}
          >
            <Input
              id="externalUrl"
              name="externalUrl"
              type="url"
              placeholder="https://..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
            />
          </Field>

          <Field
            name="eventStartAt"
            label="Başlangıç Tarihi ve Saati (opsiyonel)"
            hint="Toplantı başlangıcı, duyuru başlangıç zamanı vb."
            error={state.errors?.eventStartAt}
          >
            <Input
              id="eventStartAt"
              name="eventStartAt"
              type="datetime-local"
              value={eventStartAt}
              onChange={(e) => setEventStartAt(e.target.value)}
            />
          </Field>

          <Field
            name="eventEndAt"
            label="Bitiş Tarihi ve Saati (opsiyonel)"
            hint="Toplantı bitişi, son başvuru bitiş zamanı vb."
            error={state.errors?.eventEndAt}
          >
            <Input
              id="eventEndAt"
              name="eventEndAt"
              type="datetime-local"
              value={eventEndAt}
              onChange={(e) => setEventEndAt(e.target.value)}
            />
          </Field>

          <Field name="body" label="İçerik" required error={state.errors?.body}>
            <Textarea id="body" name="body" rows={6} required maxLength={10_000} value={body} onChange={(e) => setBody(e.target.value)} />
          </Field>

          {canPin ? (
            <div className="flex items-center gap-2">
              <Checkbox id="pinned" name="pinned" value="on" defaultChecked={Boolean(state.values?.pinned ?? defaults?.pinned)} />
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
              <Link href={cancelHref}>Vazgeç</Link>
            </Button>
            <Button type="submit" variant="brand" disabled={pending || (isAdmin && scope === "GROUP" && groupOptions.length === 0)}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
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
