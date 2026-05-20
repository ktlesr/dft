"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentInput } from "@/features/shared/attachment-input";
import { Field } from "@/features/shared/form-field";
import { createMeetingResult, type MeetingResultFormState } from "./actions";

const INITIAL: MeetingResultFormState = { ok: true };

type GroupOption = {
  id: string;
  code: string;
  name: string;
};

function groupLabel(group: GroupOption): string {
  return group.name.trim().toLowerCase() === group.code.trim().toLowerCase()
    ? group.code
    : `${group.code} - ${group.name}`;
}

export function MeetingResultForm({ groups }: { groups: GroupOption[] }) {
  const [state, action, pending] = useActionState(createMeetingResult, INITIAL);
  
  const [scope, setScope] = useState<"GENEL" | "MRDK" | "">("GENEL");
  const [mrdkTarget, setMrdkTarget] = useState<"ALL" | "SPECIFIC" | "">("ALL");

  return (
    <form action={action}>
      <Card className="shadow-md">
        <CardContent className="space-y-5 p-6">
          {!state.ok && state.message ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <Field name="title" label="Toplantı Sonucu Başlığı" required error={state.errors?.title} className="md:col-span-2">
              <Input id="title" name="title" required maxLength={200} placeholder="Örn: 2026 1. Olağan Kurul Toplantı Sonucu" />
            </Field>

            <Field name="startAt" label="Başlangıç Tarihi ve Saati" required error={state.errors?.startAt}>
              <Input id="startAt" name="startAt" type="datetime-local" required />
            </Field>

            <Field name="endAt" label="Bitiş Tarihi ve Saati" required error={state.errors?.endAt}>
              <Input id="endAt" name="endAt" type="datetime-local" required />
            </Field>

            <Field name="scope" label="Kapsam" required error={state.errors?.scope} className="md:col-span-2">
              <Select
                name="scope"
                value={scope}
                onValueChange={(val) => {
                  setScope(val as "GENEL" | "MRDK");
                  if (val === "GENEL") {
                    setMrdkTarget("ALL");
                  }
                }}
              >
                <SelectTrigger id="scope">
                  <SelectValue placeholder="Kapsam seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENEL">Genel</SelectItem>
                  <SelectItem value="MRDK">MRDK</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {scope === "MRDK" && (
              <Field name="mrdkTarget" label="MRDK Hedef Grubu" required error={state.errors?.mrdkTarget} className="md:col-span-2">
                <Select
                  name="mrdkTarget"
                  value={mrdkTarget}
                  onValueChange={(val) => setMrdkTarget(val as "ALL" | "SPECIFIC")}
                >
                  <SelectTrigger id="mrdkTarget">
                    <SelectValue placeholder="Hedef seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tüm Gruplar</SelectItem>
                    <SelectItem value="SPECIFIC">Belirli Gruplar</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            {scope === "MRDK" && mrdkTarget === "SPECIFIC" && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium">Hedef Grupları Seçin</Label>
                {state.errors?.targetGroupIds && (
                  <p className="text-xs font-medium text-destructive">{state.errors.targetGroupIds[0]}</p>
                )}
                <div className="grid gap-2 border rounded-md p-4 max-h-60 overflow-y-auto sm:grid-cols-2 md:grid-cols-3 bg-muted/20 border-border">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2 p-1.5 hover:bg-muted/40 rounded-md transition-colors">
                      <Checkbox id={`group-${group.id}`} name="targetGroupIds" value={group.id} />
                      <label htmlFor={`group-${group.id}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none">
                        <span className="font-bold text-brand-dark dark:text-brand">{groupLabel(group)}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Field name="description" label="Açıklama" error={state.errors?.description} className="md:col-span-2">
              <Textarea id="description" name="description" rows={4} maxLength={3000} placeholder="Toplantı hakkında detaylı açıklama ekleyin..." />
            </Field>
          </div>

          <div>
            <Label className="mb-1.5 block text-sm font-medium">Toplantı Sonucu Dosyası (Ekler)</Label>
            <AttachmentInput disabled={pending} />
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-5">
            <Button asChild variant="ghost" disabled={pending}>
              <Link href="/calisma-grubum">Vazgeç</Link>
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
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
