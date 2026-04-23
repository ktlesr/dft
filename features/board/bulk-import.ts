"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { MAX_BULK_IMPORT_BYTES, MAX_BULK_IMPORT_ROWS } from "@/lib/constants";
import { boardKinds } from "./schemas";

/**
 * Bulk Excel import for the general board. Admin-only, all-or-nothing.
 *
 * Security posture:
 *   - `requireAdmin()` gate (role check after session);
 *   - per-user + per-IP rate limit (5 imports / 60 min);
 *   - 5 MB body cap, 1 000 row cap;
 *   - magic-byte MIME sniff (xlsx is a zip container so the detector
 *     reports `application/zip` — declared Excel MIME is accepted as a
 *     known-equivalent);
 *   - strict Zod schema per row (enum kind, trimmed/length-checked
 *     strings, optional URL, tag list cap, boolean pinned);
 *   - ALL rows validated before a single INSERT; validation failure ⇒
 *     zero writes, detailed row-level error report returned;
 *   - single `createMany` in a transaction for atomicity.
 */

export type BulkImportError = {
  row: number;          // 1-based spreadsheet row number (incl. header)
  column?: string;
  message: string;
};

export type BulkImportState = {
  ok: boolean;
  message?: string;
  created?: number;
  errors?: BulkImportError[];
};

// Accept both the declared xlsx MIME and the raw zip signature (xlsx is a
// zip-wrapped OOXML package — `file-type` reports the container, not the
// logical Office MIME).
const ACCEPTED_UPLOAD_MIMES = new Set<string>([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

// Zod schema for a single row parsed from the spreadsheet. All fields are
// normalised before validation so type-coercion quirks of `exceljs` (which
// returns numbers/booleans when the cell is numeric/boolean) can't break
// validation.
const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

const KIND_MESSAGE = `Geçersiz tür. İzinli: ${boardKinds.join(", ")}`;

const rowSchema = z.object({
  kind: z
    .string()
    .refine((v) => (boardKinds as readonly string[]).includes(v), KIND_MESSAGE)
    .transform((v) => v as (typeof boardKinds)[number]),
  title: z.string().trim().min(2, "Başlık çok kısa.").max(200, "Başlık çok uzun."),
  body: z.string().trim().min(2, "İçerik çok kısa.").max(10_000, "İçerik çok uzun."),
  tags: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  externalUrl: optionalTrimmed(2_048).refine(
    (v) => v === undefined || /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i.test(v),
    "Geçerli bir URL girin (http:// veya https://).",
  ),
  pinned: z.boolean().optional().transform((v) => v === true),
});

type RowInput = z.infer<typeof rowSchema>;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  // exceljs returns { richText: [...] } for rich-text cells and
  // { hyperlink, text } for hyperlinks. Collapse to plain text.
  if (typeof value === "object") {
    const v = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (typeof v.text === "string") return v.text;
    if (typeof v.result === "string") return v.result;
    if (typeof v.result === "number") return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((r) => r?.text ?? "").join("");
  }
  return "";
}

function cellToBool(value: unknown): boolean | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (["true", "evet", "e", "1", "yes", "y"].includes(s)) return true;
    if (["false", "hayır", "hayir", "h", "0", "no", "n"].includes(s)) return false;
  }
  return undefined;
}

export async function bulkImportBoardPosts(
  _prev: BulkImportState,
  fd: FormData,
): Promise<BulkImportState> {
  const user = await requireAdmin();
  const ip = await getClientIp();
  const rl = await rateLimit(`board:bulk:${user.id}:${ip}`, 5, 60 * 60_000);
  if (!rl.allowed) {
    return {
      ok: false,
      message: `Çok fazla toplu içe aktarma. ${rl.retryAfterSeconds} saniye sonra tekrar deneyin.`,
    };
  }

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Lütfen bir .xlsx dosyası seçin." };
  }
  if (file.size > MAX_BULK_IMPORT_BYTES) {
    return { ok: false, message: "Dosya çok büyük (en fazla 5 MB)." };
  }

  // Phase 1: magic-byte sniff — reject non-xlsx early.
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(head);
  if (!detected || !ACCEPTED_UPLOAD_MIMES.has(detected.mime)) {
    return {
      ok: false,
      message: "Dosya türü geçersiz. Yalnızca .xlsx kabul edilir.",
    };
  }

  // Phase 2: parse. `exceljs` is dynamically imported so it stays off the
  // client bundle and off the hot path of requests that don't import.
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

  // Header is row 1. Normalise column name → column index.
  const headerRow = sheet.getRow(1);
  const colIndex: Record<string, number> = {};
  headerRow.eachCell((cell, col) => {
    const name = cellToString(cell.value).trim().toLowerCase();
    if (name) colIndex[name] = col;
  });

  const requiredCols = ["kind", "title", "body"];
  const missing = requiredCols.filter((c) => !(c in colIndex));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Başlık satırında eksik sütun(lar): ${missing.join(", ")}. Şablonu kullanın.`,
    };
  }

  const errors: BulkImportError[] = [];
  const validRows: RowInput[] = [];
  let dataRowCount = 0;

  // rowNumber in exceljs is 1-based including header, so data rows start at 2.
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row || row.cellCount === 0) continue;

    const raw = {
      kind: cellToString(row.getCell(colIndex.kind!).value).trim().toUpperCase(),
      title: cellToString(row.getCell(colIndex.title!).value).trim(),
      body: cellToString(row.getCell(colIndex.body!).value).trim(),
      tags: colIndex.tags ? cellToString(row.getCell(colIndex.tags).value) : "",
      externalUrl: colIndex.externalurl
        ? cellToString(row.getCell(colIndex.externalurl).value).trim()
        : "",
      pinned: colIndex.pinned ? cellToBool(row.getCell(colIndex.pinned).value) : false,
    };

    // Skip fully empty rows (common at the bottom of hand-edited sheets).
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
      for (const issue of parsed.error.issues) {
        errors.push({
          row: r,
          column: String(issue.path[0] ?? ""),
          message: issue.message,
        });
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
      errors: errors.slice(0, 200), // cap UI payload
    };
  }

  // Phase 3: atomic insert. `createMany` is a single SQL statement; wrapping
  // in a transaction provides rollback on mid-flight failure (connection drop,
  // unique-constraint race, etc.).
  const now = new Date();
  const data = validRows.map((v) => ({
    scope: "GENERAL" as const,
    kind: v.kind,
    title: v.title,
    body: v.body,
    tags: v.tags,
    externalUrl: v.externalUrl ?? null,
    pinned: v.pinned,
    status: "PUBLISHED" as const,
    authorId: user.id,
    groupId: null,
    publishedAt: now,
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

