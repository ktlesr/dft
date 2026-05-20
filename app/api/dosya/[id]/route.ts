import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { isAdmin } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dosya/:id
 *
 * Streams an attachment after authorization. The rule is:
 *  - viewer must be authenticated and ACTIVE,
 *  - admins see everything,
 *  - the uploader always retains access to their own file,
 *  - otherwise: general board posts + ORTAK documents are public to members,
 *    group-scoped resources require same-group membership,
 *    personal records (projectApp, event, …) are owner-only.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.status !== "ACTIVE") return new NextResponse("Forbidden", { status: 403 });

  const att = await prisma.attachment.findUnique({
    where: { id },
    include: {
      boardPost: { select: { scope: true, groupId: true, deletedAt: true } },
      meeting: { select: { groupId: true, deletedAt: true } },
      minute: {
        select: { deletedAt: true, meeting: { select: { groupId: true } } },
      },
      report: { select: { groupId: true, deletedAt: true } },
      groupNote: { select: { groupId: true, deletedAt: true } },
      document: {
        select: { category: true, groupId: true, uploadedById: true, deletedAt: true },
      },
      projectApp: { select: { ownerId: true, deletedAt: true } },
      successProject: { select: { ownerId: true, deletedAt: true } },
      projectIdea: { select: { ownerId: true, deletedAt: true } },
      event: { select: { ownerId: true, deletedAt: true } },
      dissemination: { select: { ownerId: true, deletedAt: true } },
      training: { select: { ownerId: true, deletedAt: true } },
      content: { select: { ownerId: true, deletedAt: true } },
      notice: {
        select: { scope: true, groupId: true, deletedAt: true },
      },
      discussion: {
        select: { groupId: true, deletedAt: true },
      },
      kpiCustomEvidence: {
        select: {
          kpi: {
            select: {
              groupId: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });
  if (!att) return new NextResponse("Not found", { status: 404 });

  const allowed = isAdmin(user) || att.uploadedById === user.id || canView(att, user.groupId);
  if (!allowed) return new NextResponse("Forbidden", { status: 403 });

  try {
    const { stream, size } = await storage.get(att.storageKey);
    // Faz 10: resim eklerini doğrudan tarayıcıda göstermek için `inline`
    // döndürürüz; PDF/Office/ZIP gibi binary türler `attachment` ile indirilir.
    const isImage = (att.mimeType ?? "").startsWith("image/");
    const disposition = isImage ? "inline" : "attachment";
    const headers = new Headers({
      "Content-Type": att.mimeType || "application/octet-stream",
      "Content-Length": String(size),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(att.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return new NextResponse(stream, { headers });
  } catch (err) {
    // Tanılama: 500 dönüşünün neden tetiklendiğini sunucu loglarına düşürürüz.
    // ENOENT → diskte dosya yok (storageKey ile UPLOAD_DIR uyuşmuyor / volume sıfırlanmış);
    // invalid_storage_key → resolveSafe path-traversal koruması tetiklendi.
    const e = err as NodeJS.ErrnoException;
    console.error(
      "[api/dosya] storage.get failed",
      JSON.stringify({
        attachmentId: att.id,
        storageKey: att.storageKey,
        mimeType: att.mimeType,
        uploadDir: process.env.UPLOAD_DIR ?? "./storage/uploads",
        code: e?.code,
        errno: e?.errno,
        path: e?.path,
        message: e?.message,
      }),
    );
    return new NextResponse("Storage error", { status: 500 });
  }
}

function canView(
  att: {
    boardPost: { scope: "GENERAL" | "GROUP"; groupId: string | null; deletedAt: Date | null } | null;
    meeting: { groupId: string; deletedAt: Date | null } | null;
    minute: { meeting: { groupId: string } | null; deletedAt: Date | null } | null;
    report: { groupId: string; deletedAt: Date | null } | null;
    groupNote: { groupId: string | null; deletedAt: Date | null } | null;
    document: {
      category: "ORTAK" | "GRUP" | "TUTANAK_EK" | "RAPOR_EK" | "UYE_YUKLEMESI";
      groupId: string | null;
      uploadedById: string;
      deletedAt: Date | null;
    } | null;
    projectApp: { deletedAt: Date | null } | null;
    successProject: { deletedAt: Date | null } | null;
    projectIdea: { deletedAt: Date | null } | null;
    event: { deletedAt: Date | null } | null;
    dissemination: { deletedAt: Date | null } | null;
    training: { deletedAt: Date | null } | null;
    content: { deletedAt: Date | null } | null;
    notice: { scope: "GENERAL" | "GROUP"; groupId: string | null; deletedAt: Date | null } | null;
    discussion: { groupId: string; deletedAt: Date | null } | null;
    kpiCustomEvidence: { kpi: { groupId: string; deletedAt: Date | null } } | null;
  },
  viewerGroupId: string | null,
): boolean {
  if (att.boardPost && !att.boardPost.deletedAt) {
    if (att.boardPost.scope === "GENERAL") return true;
    return att.boardPost.groupId !== null && att.boardPost.groupId === viewerGroupId;
  }
  if (att.notice && !att.notice.deletedAt) {
    if (att.notice.scope === "GENERAL") return true;
    return att.notice.groupId !== null && att.notice.groupId === viewerGroupId;
  }
  if (att.discussion && !att.discussion.deletedAt) {
    // Tartışma ekleri yalnızca aynı grubun üyelerine açıktır
    // (admin için caller'da `isAdmin` zaten true döner).
    return att.discussion.groupId === viewerGroupId;
  }
  if (att.kpiCustomEvidence && !att.kpiCustomEvidence.kpi.deletedAt) {
    return att.kpiCustomEvidence.kpi.groupId === viewerGroupId;
  }
  if (att.meeting && !att.meeting.deletedAt) return att.meeting.groupId === viewerGroupId;
  if (att.minute && !att.minute.deletedAt) return att.minute.meeting?.groupId === viewerGroupId;
  if (att.report && !att.report.deletedAt) return att.report.groupId === viewerGroupId;
  if (att.groupNote && !att.groupNote.deletedAt) {
    if (att.groupNote.groupId === null) return true;
    return att.groupNote.groupId === viewerGroupId;
  }
  if (att.document && !att.document.deletedAt) {
    const d = att.document;
    if (d.category === "ORTAK") return true;
    if (d.category === "UYE_YUKLEMESI") return false; // owner path handled by caller
    return d.groupId !== null && d.groupId === viewerGroupId;
  }
  // Personal records fall through — only the uploader (owner) may access,
  // which is handled by the uploadedById check in the caller.
  return false;
}
