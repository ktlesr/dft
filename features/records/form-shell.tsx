"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AttachmentInput } from "@/features/shared/attachment-input";
import type { RecordFormState } from "./actions";

export function FormShell({
  state,
  pending,
  children,
  cancelHref = "/kayit/yeni",
  submitLabel = "Kaydet",
  showAttachments = true,
}: {
  state: RecordFormState;
  pending: boolean;
  children: React.ReactNode;
  cancelHref?: string;
  submitLabel?: string;
  showAttachments?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        {!state.ok && state.message ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {children}

        {showAttachments ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Ek dosyalar</p>
            <AttachmentInput disabled={pending} />
          </div>
        ) : null}

        <div className="flex flex-col items-center justify-end gap-2 border-t pt-5 sm:flex-row">
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
  );
}
