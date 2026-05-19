"use client";

import { useActionState, useMemo, useState } from "react";
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
import { createNoticeFromPage, type NoticeFormState } from "./actions";

const INITIAL: NoticeFormState = { ok: true };

type GroupOpt = { id: string; code: string; name: string };

export function NoticePageForm({
  isAdmin,
  groups,
  defaultGroupId,
  canPin,
}: {
  isAdmin: boolean;
  groups: GroupOpt[];
  defaultGroupId: string | null;
  canPin: boolean;
}) {
  const [state, action, pending] = useActionState(createNoticeFromPage, INITIAL);
  const initialScope: "GENERAL" | "GROUP" =
    isAdmin && !defaultGroupId ? "GENERAL" : "GROUP";
  const [scope, setScope] = useState<"GENERAL" | "GROUP">(initialScope);

  const groupOptions = useMemo(() => groups, [groups]);
  const resolvedDefaultGroupId = defaultGroupId ?? groupOptions[0]?.id ?? "";

  return (
    <form action={action}>
      {!isAdmin ? <input type="hidden" name="scope" value="GROUP" /> : null}
      {!isAdmin && resolvedDefaultGroupId ? (
        <input type="hidden" name="groupId" value={resolvedDefaultGroupId} />
      ) : null}

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
                  <SelectItem value="GROUP">Calisma grubu bildirimi</SelectItem>
                  <SelectItem value="GENERAL">Genel bildirim</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {isAdmin && scope === "GROUP" ? (
            groupOptions.length > 0 ? (
              <Field name="groupId" label="Hedef grup" required error={state.errors?.groupId}>
                <Select name="groupId" defaultValue={resolvedDefaultGroupId || undefined}>
                  <SelectTrigger id="groupId">
                    <SelectValue placeholder="Seciniz" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.code} - {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <Alert>
                <AlertDescription>
                  Grup kapsaminda bildirim icin en az bir grup tanimli olmalidir.
                </AlertDescription>
              </Alert>
            )
          ) : null}

          <Field name="title" label="Baslik" required error={state.errors?.title}>
            <Input id="title" name="title" required maxLength={200} />
          </Field>

          <Field
            name="eventAt"
            label="Tarih ve saat (opsiyonel)"
            hint="Toplanti saati, son basvuru tarihi gibi olay zamani."
            error={state.errors?.eventAt}
          >
            <Input id="eventAt" name="eventAt" type="datetime-local" />
          </Field>

          <Field name="body" label="Icerik" required error={state.errors?.body}>
            <Textarea id="body" name="body" rows={6} required maxLength={10_000} />
          </Field>

          {canPin ? (
            <div className="flex items-center gap-2">
              <Checkbox id="pinned" name="pinned" value="on" />
              <Label htmlFor="pinned" className="text-sm font-normal">
                Uste sabitle
              </Label>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Ek dosyalar</p>
            <AttachmentInput disabled={pending} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href="/calisma-grubum?tab=bildirimler">Vazgec</Link>
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
                  Bildirim ekle
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
