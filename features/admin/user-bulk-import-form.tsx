"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bulkImportUsers,
  type BulkUserCredential,
  type BulkUserImportState,
} from "./user-bulk-import";

const INITIAL: BulkUserImportState = { ok: true };

const TEMPLATE_HEADERS = [
  "id",
  "Adı Soyadı",
  "Kurum / Kuruluş",
  "Akademik Ünvan",
  "Görevi",
  "İl",
  "Cep Tel",
  "E-Posta",
  "Çalışma Grubu",
  "Rolü",
  "Şifre",
];

function downloadBlob(filename: string, content: string, mime: string) {
  // BOM for Excel CSV — UTF-8 Türkçe karakterlerin doğru görünmesi için.
  const blob = new Blob(["﻿" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(v: string): string {
  // RFC4180 — virgül, çift tırnak veya satır içeren değerleri tırnakla.
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function buildTemplateCsv(): string {
  const sampleRow = [
    "1",
    "Örnek Üye",
    "Örnek Kurum",
    "Dr.",
    "Koordinatör",
    "Afyonkarahisar",
    "0532 000 00 00",
    "ornek@kurum.tr",
    "UAK",
    "Üye",
    "", // Şifre — boş bırakırsanız otomatik üretilir
  ].map(csvEscape).join(",");
  return TEMPLATE_HEADERS.map(csvEscape).join(",") + "\n" + sampleRow + "\n";
}

function buildCredentialsCsv(creds: BulkUserCredential[]): string {
  const head = ["Adı Soyadı", "Kullanıcı Adı", "E-Posta", "Geçici Şifre"]
    .map(csvEscape)
    .join(",");
  const rows = creds.map((c) =>
    [c.name, c.username ?? "", c.email, c.password].map(csvEscape).join(","),
  );
  return head + "\n" + rows.join("\n") + "\n";
}

export function UserBulkImportForm() {
  const [state, action, pending] = useActionState(bulkImportUsers, INITIAL);
  const [fileName, setFileName] = React.useState<string>("");

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-sm font-semibold">Üye CSV / XLSX şablonu</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Boş şablonu indir, doldur, yükle. Başlıklar sabit; sıra değişebilir.
              Zorunlu alanlar: <strong>Adı Soyadı</strong> ve <strong>E-Posta</strong>.
              Çalışma Grubu önceden tanımlı olmalı (Yönetim → Gruplar). Rolü
              boşsa "Üye" varsayılır. <strong>Şifre</strong> sütunu opsiyoneldir
              — boş bırakırsanız her üye için 10 karakterlik güçlü şifre
              otomatik üretilir; doldurursanız en az 8 karakter olmalıdır.
              Üyeler ilk girişten sonra şifrelerini Profil sayfasından
              değiştirebilir; <strong>kullanıcı adı değiştirilemez</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => downloadBlob("uye-sablonu.csv", buildTemplateCsv(), "text/csv;charset=utf-8")}
            >
              <Download className="h-4 w-4" />
              Şablonu indir (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <form action={action}>
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-sm font-semibold">Dosya yükle</h2>

            {!state.ok && state.message ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            ) : null}

            {state.ok && state.created ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {state.message ?? `${state.created} üye eklendi.`}
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="file">CSV (.csv) veya Excel (.xlsx)</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                disabled={pending}
              />
              {fileName ? (
                <p className="text-[11px] text-muted-foreground">{fileName}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Maks. 5 MB · 1.000 satır.
                </p>
              )}
            </div>

            <div className="flex justify-end">
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

            {/* Detaylı hata listesi */}
            {state.errors && state.errors.length > 0 ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-semibold text-destructive">
                  Doğrulama hataları ({state.errors.length}):
                </p>
                <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
                  {state.errors.map((e, i) => (
                    <li key={i} className="text-foreground">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Satır {e.row}
                        {e.column ? ` · ${e.column}` : ""}
                      </span>{" "}
                      — {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </form>

      {/* Başarılı import sonrası geçici şifre listesi */}
      {state.ok && state.credentials && state.credentials.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Geçici şifreler</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Her üye için 10 karakterlik güçlü şifre üretildi (büyük + küçük + rakam + sembol). CSV olarak
                  indirip <strong>güvenli kanaldan</strong> üyelere iletin.
                  Üyeler ilk girişten sonra şifrelerini Profil → Güvenlik
                  sekmesinden değiştirebilir.
                </p>
              </div>
              <Button
                type="button"
                variant="brand"
                onClick={() =>
                  downloadBlob(
                    `uye-sifreleri-${new Date().toISOString().slice(0, 10)}.csv`,
                    buildCredentialsCsv(state.credentials!),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV indir
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-1.5 pr-3 font-medium">Ad</th>
                    <th className="py-1.5 pr-3 font-medium">Kullanıcı Adı</th>
                    <th className="py-1.5 pr-3 font-medium">E-Posta</th>
                    <th className="py-1.5 font-medium">Geçici Şifre</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {state.credentials.map((c, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3">{c.name}</td>
                      <td className="py-1.5 pr-3 font-mono">{c.username ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-mono">{c.email}</td>
                      <td className="py-1.5 font-mono">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
