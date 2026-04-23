"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Download, Loader2, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bulkImportBoardPosts, type BulkImportState } from "./bulk-import";

const INITIAL: BulkImportState = { ok: true };

export function BulkImportForm() {
  const [state, action, pending] = useActionState(bulkImportBoardPosts, INITIAL);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = React.useState<string>("");

  React.useEffect(() => {
    // Reset file input after a successful import so the admin can upload
    // another batch without the stale filename lingering.
    if (!pending && state.ok && state.created && state.created > 0) {
      formRef.current?.reset();
      setFileName("");
    }
  }, [state, pending]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">1. Şablonu indirin</p>
            <p className="text-xs text-muted-foreground">
              Sütunlar veri tabanı şemasıyla birebir uyumludur. Açılır listeler ve
              açıklama sayfası dahildir.
            </p>
          </div>
          <Button asChild variant="secondary">
            <a href="/api/admin/panolar/sablon" download>
              <Download className="h-4 w-4" />
              Şablonu indir (.xlsx)
            </a>
          </Button>
        </div>
      </div>

      <form ref={formRef} action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file" className="text-sm font-medium">
            2. Doldurulmuş dosyayı yükleyin
          </Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            disabled={pending}
            onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? "")}
            className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <p className="text-[11px] text-muted-foreground">
            En fazla 5 MB · en fazla 1 000 satır · yalnızca .xlsx
          </p>
          {fileName ? (
            <p className="text-xs text-foreground">Seçilen dosya: {fileName}</p>
          ) : null}
        </div>

        {!state.ok && state.message ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>İçe aktarma başarısız</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {state.ok && state.message && state.created && state.created > 0 ? (
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Başarılı</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {state.errors && state.errors.length > 0 ? <ErrorTable errors={state.errors} /> : null}

        <div className="flex items-center gap-2">
          <Button type="submit" variant="brand" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                İçe aktarılıyor…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                İçe aktar
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ErrorTable({ errors }: { errors: NonNullable<BulkImportState["errors"]> }) {
  return (
    <div className="rounded-lg border border-destructive/30">
      <div className="border-b border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive">
        Hata listesi ({errors.length})
      </div>
      <div className="max-h-72 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium w-16">Satır</th>
              <th className="px-3 py-2 text-left font-medium w-28">Sütun</th>
              <th className="px-3 py-2 text-left font-medium">Hata</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((e, i) => (
              <tr key={i} className="border-b last:border-b-0">
                <td className="px-3 py-1.5 tabular-nums">{e.row}</td>
                <td className="px-3 py-1.5 font-mono text-[11px]">{e.column ?? "—"}</td>
                <td className="px-3 py-1.5 text-destructive">{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
