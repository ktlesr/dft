import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { isAdmin } from "@/lib/rbac";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { boardKinds } from "@/features/board/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/panolar/sablon
 *
 * Returns an .xlsx template for bulk general-board imports.
 *
 * Columns mirror `BoardPost` (general-scope subset):
 *   kind           BoardPostKind enum — dropdown-guarded cell
 *   title          required string
 *   body           required string (long text)
 *   tags           optional, comma-separated (max 12)
 *   externalUrl    optional http(s) URL
 *   pinned         optional boolean (TRUE/FALSE)
 *
 * Two sheets:
 *   "Paylasimlar"  data entry sheet with a sample row
 *   "Aciklama"     human-readable column guide + enum list
 *
 * Admin-only. Generated on the fly — no caching.
 */
export async function GET(_req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.status !== "ACTIVE") return new NextResponse("Forbidden", { status: 403 });
  if (!isAdmin(user)) return new NextResponse("Forbidden", { status: 403 });

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "DFT Portal";
  wb.created = new Date();

  // ── Data sheet ─────────────────────────────────────────────────
  const ws = wb.addWorksheet("Paylasimlar", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = [
    { header: "kind", key: "kind", width: 16 },
    { header: "title", key: "title", width: 40 },
    { header: "body", key: "body", width: 60 },
    { header: "tags", key: "tags", width: 28 },
    { header: "externalUrl", key: "externalUrl", width: 40 },
    { header: "pinned", key: "pinned", width: 10 },
  ];

  // Header styling + comment
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle" };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF2FF" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // Sample row to prevent guessing
  ws.addRow({
    kind: "NEWS",
    title: "Örnek başlık",
    body: "Bu örnek satır; silip kendi kayıtlarınızı girebilirsiniz.",
    tags: "örnek, şablon",
    externalUrl: "",
    pinned: "FALSE",
  });

  // Data validations applied to rows 2..1001 (template cap: MAX_BULK_IMPORT_ROWS).
  const kindsList = `"${boardKinds.join(",")}"`;
  const boolList = `"TRUE,FALSE"`;
  const lastRow = 1001;

  for (let r = 2; r <= lastRow; r++) {
    ws.getCell(`A${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [kindsList],
      showErrorMessage: true,
      errorTitle: "Geçersiz tür",
      error: `İzinli değerler: ${boardKinds.join(", ")}`,
    };
    ws.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [boolList],
    };
  }

  // ── Aciklama (guide) sheet ─────────────────────────────────────
  const guide = wb.addWorksheet("Aciklama");
  guide.columns = [
    { header: "Sütun", key: "col", width: 18 },
    { header: "Zorunlu mu?", key: "req", width: 14 },
    { header: "Açıklama", key: "desc", width: 80 },
  ];
  guide.getRow(1).font = { bold: true };

  guide.addRows([
    {
      col: "kind",
      req: "Evet",
      desc: `Paylaşım türü. İzinli değerler: ${Object.entries(BOARD_KIND_LABELS)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")}`,
    },
    {
      col: "title",
      req: "Evet",
      desc: "Başlık. 2–200 karakter.",
    },
    {
      col: "body",
      req: "Evet",
      desc: "İçerik metni. 2–10.000 karakter. Satır sonu için hücre içinde ALT+Enter kullanabilirsiniz.",
    },
    {
      col: "tags",
      req: "Hayır",
      desc: "Etiketler. Virgülle ayırın. En fazla 12 etiket.",
    },
    {
      col: "externalUrl",
      req: "Hayır",
      desc: "Varsa, tam URL (http:// veya https:// ile başlamalı).",
    },
    {
      col: "pinned",
      req: "Hayır",
      desc: "Üste sabitlensin mi? TRUE ya da FALSE. Boş bırakılırsa FALSE.",
    },
    {},
    {
      col: "NOT",
      req: "",
      desc: "Tüm satırlar önce doğrulanır. Herhangi bir satırda hata varsa hiçbir kayıt oluşturulmaz.",
    },
    {
      col: "SINIR",
      req: "",
      desc: "En fazla 1.000 satır, en fazla 5 MB dosya boyutu.",
    },
    {
      col: "KAPSAM",
      req: "",
      desc: "Bu şablon yalnızca Genel Pano içindir (tüm DFT üyelerine açık paylaşımlar).",
    },
  ]);

  // Freeze header + subtle row banding
  guide.views = [{ state: "frozen", ySplit: 1 }];
  for (let r = 2; r <= guide.rowCount; r++) {
    if (r % 2 === 0) {
      guide.getRow(r).eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      });
    }
    guide.getRow(r).alignment = { vertical: "top", wrapText: true };
  }

  const buf = await wb.xlsx.writeBuffer();
  const bytes = new Uint8Array(buf as ArrayBuffer);

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename*=UTF-8''genel-pano-toplu-sablon.xlsx",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
