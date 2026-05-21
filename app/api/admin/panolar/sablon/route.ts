import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { isAdmin } from "@/lib/rbac";
import { BOARD_KIND_LABELS, BOARD_KIND_BY_SCOPE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/panolar/sablon
 *
 * Bulk general-board import template.
 *
 * Generic (default) layout — tüm GENERAL türlerini (Haber, Çağrı/Hibe,
 * Doküman Paylaşımı) destekler:
 *
 *   No · Başlık · Tarih · Tür · Bağlantı · İçerik · Değerlendirme/Yorum
 *
 * `?kategori=cagri-hibe-etkinlik` ile çağrılırsa **Çağrı/Hibe Duyurusu
 * özel şablonu** üretilir: Tür sütunu kaldırılır, başlık etiketleri
 * "Çağrı/Hibe Adı" + "Son Başvuru Tarihi" olur. Importer böyle bir
 * dosyada Tür sütununu görmediği için tüm satırları ANNOUNCEMENT olarak
 * kaydeder (bkz. [features/board/bulk-import.ts]).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.status !== "ACTIVE") return new NextResponse("Forbidden", { status: 403 });
  if (!isAdmin(user)) return new NextResponse("Forbidden", { status: 403 });

  const kategori = req.nextUrl.searchParams.get("kategori");
  const isCallGrant = kategori === "cagri-hibe-etkinlik";

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "DFT Portal";
  wb.created = new Date();

  // ── Data sheet ─────────────────────────────────────────────────
  const ws = wb.addWorksheet("Paylasimlar", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // Çağrı/Hibe modunda Tür sütunu yok; başlık/tarih etiketleri özel.
  ws.columns = isCallGrant
    ? [
        { header: "No", key: "no", width: 6 },
        { header: "Çağrı/Hibe Adı", key: "title", width: 36 },
        { header: "Son Başvuru Tarihi", key: "publishedAt", width: 18 },
        { header: "Bağlantı", key: "externalUrl", width: 36 },
        { header: "Açıklama", key: "body", width: 60 },
        { header: "Değerlendirme/Yorum", key: "assessment", width: 60 },
      ]
    : [
        { header: "No", key: "no", width: 6 },
        { header: "Başlık", key: "title", width: 36 },
        { header: "Tarih", key: "publishedAt", width: 16 },
        { header: "Tür", key: "kind", width: 22 },
        { header: "Bağlantı", key: "externalUrl", width: 36 },
        { header: "İçerik", key: "body", width: 60 },
        { header: "Değerlendirme/Yorum", key: "assessment", width: 60 },
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

  // Sample row
  if (isCallGrant) {
    ws.addRow({
      no: 1,
      title: "Örnek Çağrı/Hibe adı",
      publishedAt: new Date(),
      externalUrl: "",
      body: "Bu örnek satırı silip kendi kayıtlarınızı girebilirsiniz.",
      assessment: "İsteğe bağlı — değerlendirme/yorum.",
    });
    ws.getCell("C2").numFmt = "dd.mm.yyyy";
  } else {
    ws.addRow({
      no: 1,
      title: "Örnek paylaşım başlığı",
      publishedAt: new Date(),
      kind: BOARD_KIND_LABELS.NEWS,
      externalUrl: "",
      body: "Bu örnek satırı silip kendi kayıtlarınızı girebilirsiniz.",
      assessment: "İsteğe bağlı — değerlendirme/yorum.",
    });
    ws.getCell("C2").numFmt = "dd.mm.yyyy";
  }

  const lastRow = 1001;
  const kindLabels = BOARD_KIND_BY_SCOPE.GENERAL.map((k) => BOARD_KIND_LABELS[k]);

  if (isCallGrant) {
    // Tarih sütunu C; body/assessment E,F.
    for (let r = 2; r <= lastRow; r++) {
      ws.getCell(`C${r}`).numFmt = "dd.mm.yyyy";
      ws.getCell(`E${r}`).alignment = { wrapText: true, vertical: "top" };
      ws.getCell(`F${r}`).alignment = { wrapText: true, vertical: "top" };
    }
  } else {
    const kindsList = `"${kindLabels.join(",")}"`;
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
      ws.getCell(`F${r}`).alignment = { wrapText: true, vertical: "top" };
      ws.getCell(`G${r}`).alignment = { wrapText: true, vertical: "top" };
    }
  }

  // ── Aciklama (guide) sheet ─────────────────────────────────────
  const guide = wb.addWorksheet("Aciklama");
  guide.columns = [
    { header: "Sütun", key: "col", width: 32 },
    { header: "Zorunlu mu?", key: "req", width: 14 },
    { header: "Açıklama", key: "desc", width: 80 },
  ];
  guide.getRow(1).font = { bold: true };

  if (isCallGrant) {
    guide.addRows([
      { col: "No", req: "Hayır", desc: "Sadece görünüm amaçlıdır; içe aktarmada kullanılmaz." },
      { col: "Çağrı/Hibe Adı", req: "Evet", desc: "Başlık. 2–200 karakter." },
      {
        col: "Son Başvuru Tarihi",
        req: "Hayır",
        desc: "Tarih hücresi (dd.mm.yyyy). Boş bırakılırsa içe aktarma anındaki tarih kullanılır.",
      },
      { col: "Bağlantı", req: "Hayır", desc: "Tam URL (http:// veya https:// ile başlamalı)." },
      { col: "Açıklama", req: "Evet", desc: "Çağrı/hibe açıklaması. 2–10.000 karakter." },
      { col: "Değerlendirme/Yorum", req: "Hayır", desc: "Editör notu / değerlendirme. En fazla 10.000 karakter." },
      {},
      { col: "NOT", req: "", desc: "Tüm satırlar Çağrı/Hibe Duyurusu olarak kaydedilir." },
      { col: "NOT", req: "", desc: "Tüm satırlar önce doğrulanır. Bir hata varsa hiç kayıt eklenmez." },
      { col: "SINIR", req: "", desc: "En fazla 1.000 satır, en fazla 5 MB dosya boyutu." },
    ]);
  } else {
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
      { col: "İlgili Bağlantı", req: "Hayır", desc: "Tam URL (http:// veya https:// ile başlamalı)." },
      { col: "Paylaşımın İçeriği", req: "Evet", desc: "İçerik metni. 2–10.000 karakter. Hücre içinde satır için ALT+Enter." },
      { col: "Değerlendirme/Yorum", req: "Hayır", desc: "Editör notu / değerlendirme. En fazla 10.000 karakter." },
      {},
      { col: "NOT", req: "", desc: "Tüm satırlar önce doğrulanır. Bir hata varsa hiç kayıt eklenmez." },
      { col: "SINIR", req: "", desc: "En fazla 1.000 satır, en fazla 5 MB dosya boyutu." },
      { col: "KAPSAM", req: "", desc: "Bu şablon yalnızca Genel Pano kayıtları içindir." },
    ]);
  }

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

  const filename = isCallGrant
    ? "cagri-hibe-toplu-sablon.xlsx"
    : "genel-pano-toplu-sablon.xlsx";

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
