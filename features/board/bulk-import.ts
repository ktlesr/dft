"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  BOARD_KIND_BY_SCOPE,
  BOARD_KIND_LABELS,
  MAX_BULK_IMPORT_BYTES,
  MAX_BULK_IMPORT_ROWS,
} from "@/lib/constants";

/**
 * Bulk Excel import for the general board. Admin-only, all-or-nothing.
 *
 * Column layout follows the Faz 6 template — human-friendly Turkish
 * headers. The importer normalises header names (diacritic-insensitive,
 * lowercased) so light edits in the template (ör. başlıkları kalınlaştırmak)
 * won't break parsing.
 *
 * Security posture:
 *   - `requireAdmin()` gate;
 *   - per-user + per-IP rate limit (5 imports / 60 min);
 *   - 5 MB body cap, 1 000 row cap;
 *   - magic-byte MIME sniff;
 *   - strict Zod schema per row (enum, trim/length, optional URL, date);
 *   - ALL rows validated before a single INSERT; any failure ⇒ zero writes.
 */

export type BulkImportError = {
  row: number;
  column?: string;
  message: string;
};

export type BulkImportState = {
  ok: boolean;
  message?: string;
  created?: number;
  errors?: BulkImportError[];
};

const ACCEPTED_UPLOAD_MIMES = new Set<string>([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

// ── Turkish header → canonical key normalisation ────────────────
// A minimal Turkish-aware collapse: lowercase, strip diacritics, remove
// non-word characters. Keeps header matching tolerant to typos like
// "paylaşımın i̇çeriği" vs "paylasimin icerigi".
function tr(s: string): string {
  return s
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Maps a normalised header to our canonical field key.
const HEADER_MAP: Record<string, "no" | "title" | "publishedAt" | "kind" | "externalUrl" | "body" | "assessment"> = {
  "no": "no",
  "baslik": "title",
  "tarih": "publishedAt",
  "tur": "kind",
  "baglanti": "externalUrl",
  "icerik": "body",
  "degerlendirme/yorum": "assessment",
  // English fallbacks (keep older template uploads working)
  "title": "title",
  "body": "body",
  "kind": "kind",
  "externalurl": "externalUrl",
  "publishedat": "publishedAt",
  "assessment": "assessment",
};

// Kind label (Turkish) → enum. Built from BOARD_KIND_BY_SCOPE.GENERAL so
// adding a new public kind in one place keeps everything in sync.
const KIND_LABEL_TO_ENUM: Record<string, (typeof BOARD_KIND_BY_SCOPE.GENERAL)[number]> = (() => {
  const m: Record<string, (typeof BOARD_KIND_BY_SCOPE.GENERAL)[number]> = {};
  for (const k of BOARD_KIND_BY_SCOPE.GENERAL) {
    m[tr(BOARD_KIND_LABELS[k])] = k;
    m[tr(k)] = k; // accept raw enum too
  }
  return m;
})();

// ── Per-row validation ──────────────────────────────────────────

const rowSchema = z.object({
  kind: z
    .string()
    .refine(
      (v) => tr(v) in KIND_LABEL_TO_ENUM,
      `Geçersiz tür. İzinli: ${BOARD_KIND_BY_SCOPE.GENERAL.map((k) => BOARD_KIND_LABELS[k]).join(", ")}`,
    )
    .transform((v) => KIND_LABEL_TO_ENUM[tr(v)]!),
  title: z.string().trim().min(2, "Başlık çok kısa.").max(200, "Başlık çok uzun."),
  body: z.string().trim().min(2, "İçerik çok kısa.").max(10_000, "İçerik çok uzun."),
  assessment: z
    .string()
    .trim()
    .max(10_000, "Değerlendirme çok uzun.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  externalUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine(
      (v) =>
        v === undefined ||
        /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i.test(v),
      "Geçerli bir URL girin (http:// veya https://).",
    ),
  publishedAt: z
    .date()
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Geçersiz tarih."),
});

type RowInput = z.infer<typeof rowSchema>;

// ── Cell coercers ───────────────────────────────────────────────

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (typeof v.text === "string") return v.text;
    if (typeof v.result === "string") return v.result;
    if (typeof v.result === "number") return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((r) => r?.text ?? "").join("");
  }
  return "";
}

function cellToDate(value: unknown): Date | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // Excel serial date → JS Date. exceljs normally returns a Date; this
    // branch covers hand-crafted files.
    return new Date(Math.round((value - 25569) * 86400 * 1000));
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return undefined;
    // dd.mm.yyyy or dd/mm/yyyy
    const tr = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
    if (tr) {
      const [, d, m, y] = tr;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const iso = new Date(s);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  return undefined;
}

// ── Server action ───────────────────────────────────────────────

export async function bulkImportBoardPosts(
  _prev: BulkImportState,
  fd: FormData,
): Promise<BulkImportState> {
  const user = await requireAdmin();
  const ip = await getClientIp();
  // Bulk import is admin-only (requireAdmin above). The rate limit here
  // guards against a compromised admin cookie or a runaway retry loop,
  // not regular usage — so we allow a generous quota that accommodates
  // trial/error cycles when an Excel has validation errors (each failed
  // attempt also burns a token).
  const rl = await rateLimit(`board:bulk:${user.id}:${ip}`, 60, 60 * 60_000);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterSeconds / 60);
    return {
      ok: false,
      message: `Çok fazla toplu içe aktarma. Yaklaşık ${minutes} dakika sonra tekrar deneyin.`,
    };
  }

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Lütfen bir .xlsx dosyası seçin." };
  }
  if (file.size > MAX_BULK_IMPORT_BYTES) {
    return { ok: false, message: "Dosya çok büyük (en fazla 5 MB)." };
  }

  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(head);
  if (!detected || !ACCEPTED_UPLOAD_MIMES.has(detected.mime)) {
    return { ok: false, message: "Dosya türü geçersiz. Yalnızca .xlsx kabul edilir." };
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    const buf = await file.arrayBuffer();
    await workbook.xlsx.load(buf);
  } catch {
    return { ok: false, message: "Dosya okunamadı veya bozuk." };
  }

  const sheet = workbook.getWorksheet("Paylasimlar") ?? workbook.worksheets[0];
  if (!sheet) {
    return { ok: false, message: "Sayfa bulunamadı. Şablonu kullandığınızdan emin olun." };
  }

  // Build column index from normalised header names
  const headerRow = sheet.getRow(1);
  const colIndex: Partial<Record<keyof typeof HEADER_MAP | "title" | "publishedAt" | "kind" | "externalUrl" | "body" | "assessment" | "no", number>> = {};
  headerRow.eachCell((cell, col) => {
    const raw = cellToString(cell.value).trim();
    const norm = tr(raw);
    const key = HEADER_MAP[norm as keyof typeof HEADER_MAP];
    if (key) colIndex[key] = col;
  });

  const requiredCols: Array<keyof typeof colIndex> = ["title", "kind", "body"];
  const missing = requiredCols.filter((c) => !(c in colIndex));
  if (missing.length > 0) {
    const labelFor: Record<string, string> = {
      title: "Paylaşım İsmi",
      kind: "Paylaşım Türü",
      body: "Paylaşımın İçeriği",
    };
    return {
      ok: false,
      message: `Başlık satırında eksik sütun(lar): ${missing.map((c) => labelFor[c] ?? c).join(", ")}. Şablonu kullanın.`,
    };
  }

  const errors: BulkImportError[] = [];
  const validRows: RowInput[] = [];
  let dataRowCount = 0;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row || row.cellCount === 0) continue;

    const raw = {
      kind: cellToString(row.getCell(colIndex.kind!).value).trim(),
      title: cellToString(row.getCell(colIndex.title!).value).trim(),
      body: cellToString(row.getCell(colIndex.body!).value).trim(),
      externalUrl: colIndex.externalUrl
        ? cellToString(row.getCell(colIndex.externalUrl).value).trim()
        : "",
      assessment: colIndex.assessment
        ? cellToString(row.getCell(colIndex.assessment).value).trim()
        : "",
      publishedAt: colIndex.publishedAt
        ? cellToDate(row.getCell(colIndex.publishedAt).value)
        : undefined,
    };

    if (!raw.kind && !raw.title && !raw.body) continue;
    dataRowCount += 1;

    if (dataRowCount > MAX_BULK_IMPORT_ROWS) {
      return {
        ok: false,
        message: `En fazla ${MAX_BULK_IMPORT_ROWS} satır içe aktarılabilir.`,
      };
    }

    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      const labelFor: Record<string, string> = {
        kind: "Paylaşım Türü",
        title: "Paylaşım İsmi",
        body: "Paylaşımın İçeriği",
        externalUrl: "İlgili Bağlantı",
        publishedAt: "Paylaşım Tarihi",
        assessment: "Değerlendirme",
      };
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "");
        errors.push({ row: r, column: labelFor[k] ?? k, message: issue.message });
      }
      continue;
    }
    validRows.push(parsed.data);
  }

  if (dataRowCount === 0) {
    return { ok: false, message: "Dosyada veri satırı bulunamadı." };
  }
  if (errors.length > 0) {
    return {
      ok: false,
      message: `${errors.length} hata bulundu. Hiçbir kayıt oluşturulmadı.`,
      errors: errors.slice(0, 200),
    };
  }

  const now = new Date();
  const data = validRows.map((v) => ({
    scope: "GENERAL" as const,
    kind: v.kind,
    title: v.title,
    body: v.body,
    assessment: v.assessment ?? null,
    tags: [] as string[],
    externalUrl: v.externalUrl ?? null,
    pinned: false,
    status: "PUBLISHED" as const,
    authorId: user.id,
    groupId: null,
    publishedAt: v.publishedAt ?? now,
  }));

  const result = await prisma.$transaction(async (tx) => {
    return tx.boardPost.createMany({ data });
  });

  await audit({
    action: "BOARD_POST_CREATED",
    actorId: user.id,
    targetType: "BoardPost",
    metadata: { bulk: true, count: result.count },
  });

  revalidatePath("/panolar/genel");
  revalidatePath("/panel");

  return {
    ok: true,
    message: `${result.count} paylaşım başarıyla eklendi.`,
    created: result.count,
  };
}
