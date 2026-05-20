import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { isAdmin } from "@/lib/rbac";
import { BOARD_KIND_LABELS, BOARD_KIND_BY_SCOPE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/panolar/sablon
 *
 * Bulk general-board import template. Columns mirror the human-facing
 * layout the DFT team already uses in their internal planning sheet
 * (see Faz 6 notes):
 *
 *   No                                               // display only — ignored on import
 *   Paylaşım İsmi                                    // title         (required)
 *   Paylaşım Tarihi                                  // publishedAt   (optional)
 *   Paylaşım Türü                                    // kind          (required, dropdown)
 *   İlgili Bağlantı                                  // externalUrl   (optional)
 *   Paylaşımın İçeriği                               // body          (required)
 *   Değerlendirme/Yorum                             // assessment   (optional, long text)
 *
 * Tür dropdown values are the user-facing labels; the import action
 * reverses them into BoardPostKind enums.
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
    { header: "No", key: "no", width: 6 },
    { header: "Başlık", key: "title", width: 36 },
    { header: "Tarih", key: "publishedAt", width: 16 },
    { header: "Tür", key: "kind", width: 22 },
    { header: "Bağlantı", key: "externalUrl", width: 36 },
    { header: "İçerik", key: "body", width: 60 },
    {
      header: "Değerlendirme/Yorum",
      key: "assessment",
      width: 60,
    },
  ];

  // Header styling
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 36;
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF2FF" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // Sample row (user can overwrite / delete)
  ws.addRow({
    no: 1,
    title: "Örnek paylaşım başlığı",
    publishedAt: new Date(),
    kind: BOARD_KIND_LABELS.NEWS, // "Haber/Etkinlik"
    externalUrl: "",
    body: "Bu örnek satırı silip kendi kayıtlarınızı girebilirsiniz.",
    assessment: "İsteğe bağlı — değerlendirme/yorum.",
  });
  ws.getCell("C2").numFmt = "dd.mm.yyyy";

  // Data validations (rows 2..1001)
  const kindLabels = BOARD_KIND_BY_SCOPE.GENERAL.map((k) => BOARD_KIND_LABELS[k]);
  const kindsList = `"${kindLabels.join(",")}"`;
  const lastRow = 1001;

  for (let r = 2; r <= lastRow; r++) {
    ws.getCell(`C${r}`).numFmt = "dd.mm.yyyy";
    ws.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [kindsList],
      showErrorMessage: true,
      errorTitle: "Geçersiz tür",
      error: `İzinli değerler: ${kindLabels.join(", ")}`,
    };
  }

  // Wrap body + assessment cells by default
  for (let r = 2; r <= lastRow; r++) {
    ws.getCell(`F${r}`).alignment = { wrapText: true, vertical: "top" };
    ws.getCell(`G${r}`).alignment = { wrapText: true, vertical: "top" };
  }

  // ── Aciklama (guide) sheet ─────────────────────────────────────
  const guide = wb.addWorksheet("Aciklama");
  guide.columns = [
    { header: "Sütun", key: "col", width: 32 },
    { header: "Zorunlu mu?", key: "req", width: 14 },
    { header: "Açıklama", key: "desc", width: 80 },
  ];
  guide.getRow(1).font = { bold: true };

  guide.addRows([
    { col: "No", req: "Hayır", desc: "Sadece görünüm amaçlıdır; içe aktarmada kullanılmaz." },
    { col: "Paylaşım İsmi", req: "Evet", desc: "Başlık. 2–200 karakter." },
    {
      col: "Paylaşım Tarihi",
      req: "Hayır",
      desc: "Tarih hücresi (dd.mm.yyyy). Boş bırakılırsa içe aktarma anındaki tarih kullanılır.",
    },
    {
      col: "Paylaşım Türü",
      req: "Evet",
      desc: `Açılır listeden seçin. İzinli değerler: ${kindLabels.join(", ")}`,
    },
    {
      col: "İlgili Bağlantı",
      req: "Hayır",
      desc: "Tam URL (http:// veya https:// ile başlamalı).",
    },
    {
      col: "Paylaşımın İçeriği",
      req: "Evet",
      desc: "İçerik metni. 2–10.000 karakter. Hücre içinde satır için ALT+Enter.",
    },
    {
      col: "Değerlendirme/Yorum",
      req: "Hayır",
      desc: "Editör notu / değerlendirme. En fazla 10.000 karakter.",
    },
    {},
    { col: "NOT", req: "", desc: "Tüm satırlar önce doğrulanır. Bir hata varsa hiç kayıt eklenmez." },
    { col: "SINIR", req: "", desc: "En fazla 1.000 satır, en fazla 5 MB dosya boyutu." },
    { col: "KAPSAM", req: "", desc: "Bu şablon yalnızca Genel Pano kayıtları içindir." },
  ]);

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
