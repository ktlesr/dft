"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { redirectUnauthorized, requireActiveUser, requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin, isModerator } from "@/lib/rbac";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";
import { UploadError, storeAttachments } from "@/lib/upload";
import { BOARD_KIND_BY_SCOPE } from "@/lib/constants";
import { boardPostEditSchema, boardPostSchema } from "./schemas";

export type BoardFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: BoardFormState = { ok: true };

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

function filesFrom(fd: FormData): File[] {
  return fd.getAll("attachments").filter((v): v is File => v instanceof File);
}

function canPinIn(scope: "GENERAL" | "GROUP", user: Awaited<ReturnType<typeof requireActiveUser>>) {
  if (isAdmin(user)) return true;
  if (scope === "GROUP" && isModerator(user)) return true;
  return false;
}

/** Create a board post. Scope is validated against user's role / group. */
export async function createBoardPost(
  _prev: BoardFormState,
  fd: FormData,
): Promise<BoardFormState> {
  const user = await requireActiveUser();
  const ip = await getClientIp();
  const rl = await rateLimit(`board:${user.id}:${ip}`, 15, 10 * 60_000);
  if (!rl.allowed) {
    return { ok: false, message: "Çok fazla paylaşım denemesi. Biraz sonra tekrar deneyin." };
  }

  const parsed = boardPostSchema.safeParse({
    scope: fd.get("scope"),
    kind: fd.get("kind"),
    title: fd.get("title"),
    body: fd.get("body"),
    assessment: fd.get("assessment"),
    publishedAt: fd.get("publishedAt"),
    externalUrl: fd.get("externalUrl"),
    tags: fd.get("tags"),
    pinned: fd.get("pinned"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  // Group-scoped posts require a group membership; general posts are open.
  if (parsed.data.scope === "GROUP" && !user.groupId) {
    return { ok: false, message: "Çalışma grubunuz atanmadığı için grup panosuna paylaşım yapamazsınız." };
  }

  // Enforce the per-scope kind allow-list (Faz 6 sadeleştirmesi) — a
  // forged client could otherwise still submit legacy kinds like
  // SUGGESTION/DISCUSSION.
  const allowedKinds = BOARD_KIND_BY_SCOPE[parsed.data.scope] as readonly string[];
  if (!allowedKinds.includes(parsed.data.kind)) {
    return { ok: false, errors: { kind: ["Bu pano için geçersiz tür."] } };
  }

  const pinned = parsed.data.pinned && canPinIn(parsed.data.scope, user);

  const row = await prisma.boardPost.create({
    data: {
      scope: parsed.data.scope,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      // assessment only makes sense on the general board — ignored for
      // group scope even if a crafted client sends it.
      assessment:
        parsed.data.scope === "GENERAL" ? parsed.data.assessment ?? null : null,
      tags: parsed.data.tags,
      externalUrl: parsed.data.externalUrl ?? null,
      pinned,
      status: "PUBLISHED",
      authorId: user.id,
      groupId: parsed.data.scope === "GROUP" ? user.groupId : null,
      // Honour a user-provided publish date on the general board; group
      // posts always publish with the default `now()`.
      ...(parsed.data.scope === "GENERAL" && parsed.data.publishedAt
        ? { publishedAt: parsed.data.publishedAt }
        : {}),
    },
  });

  try {
    await storeAttachments({
      files: filesFrom(fd),
      uploadedById: user.id,
      owner: { boardPostId: row.id },
    });
  } catch (e) {
    await prisma.boardPost.delete({ where: { id: row.id } });
    if (e instanceof UploadError) return { ok: false, message: "Ek dosya reddedildi." };
    throw e;
  }

  await audit({ action: "BOARD_POST_CREATED", actorId: user.id, targetType: "BoardPost", targetId: row.id });
  revalidatePath(parsed.data.scope === "GENERAL" ? "/panolar/genel" : "/panolar/grup");
  revalidatePath("/calisma-grubum");
  revalidatePath("/panel");
  return OK;
}

/**
 * Sayfa formu (/bildirim/yeni) için sürüm — başarıda doğrudan
 * /calisma-grubum'a yönlendirir. Dialog kullanan akış hâlâ
 * `createBoardPost` (state döner) kullanır.
 */
export async function createGroupNoticeFromPage(
  _prev: BoardFormState,
  fd: FormData,
): Promise<BoardFormState> {
  const result = await createBoardPost(_prev, fd);
  if (result.ok && !result.errors && !result.message) {
    // `createBoardPost` zaten revalidate ediyor; burada da Bildirimler
    // sekmesine ulaşan yolu kesin yenile + yönlendir.
    revalidatePath("/calisma-grubum");
    redirect("/calisma-grubum?tab=bildirimler");
  }
  return result;
}

/**
 * Edit an existing board post. Admin-only — fields, tags, kind ve ek
 * dosyalar (ekleme/silme) güncellenebilir. `scope` ve `pinned` değişmez.
 */
export async function updateBoardPost(
  _prev: BoardFormState,
  fd: FormData,
): Promise<BoardFormState> {
  const user = await requireAdmin();

  const id = String(fd.get("id") ?? "");
  if (!id) return { ok: false, message: "Paylaşım bulunamadı." };

  const post = await prisma.boardPost.findUnique({
    where: { id },
    include: { attachments: { select: { id: true, storageKey: true } } },
  });
  if (!post || post.deletedAt) return { ok: false, message: "Paylaşım bulunamadı." };

  const parsed = boardPostEditSchema.safeParse({
    kind: fd.get("kind"),
    title: fd.get("title"),
    body: fd.get("body"),
    assessment: fd.get("assessment"),
    publishedAt: fd.get("publishedAt"),
    externalUrl: fd.get("externalUrl"),
    tags: fd.get("tags"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const allowedKinds = BOARD_KIND_BY_SCOPE[post.scope] as readonly string[];
  if (!allowedKinds.includes(parsed.data.kind)) {
    return { ok: false, errors: { kind: ["Bu pano için geçersiz tür."] } };
  }

  // Silinecek ek dosyalar — formdaki "removeAttachmentIds" değerleri.
  // Yalnızca bu post'a ait olanları kabul et (forge edilmiş id'leri yok say).
  const requestedRemoveIds = new Set(
    fd
      .getAll("removeAttachmentIds")
      .map((v) => String(v))
      .filter((s) => s.length > 0),
  );
  const removeRows = post.attachments.filter((a) => requestedRemoveIds.has(a.id));

  // Yeni dosyalar — `storeAttachments` ile doğrulanır ve eklenir.
  const newFiles = filesFrom(fd);

  // Önce metin alanlarını güncelle. Ek dosyalar başarısız olursa kayıt geri
  // alınamaz ama orijinal davranışla uyumlu: storeAttachments hata fırlatırsa
  // yeni eklenen dosyalar storage'tan otomatik temizleniyor.
  await prisma.boardPost.update({
    where: { id },
    data: {
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      assessment:
        post.scope === "GENERAL" ? parsed.data.assessment ?? null : null,
      tags: parsed.data.tags,
      externalUrl: parsed.data.externalUrl ?? null,
      ...(post.scope === "GENERAL" && parsed.data.publishedAt
        ? { publishedAt: parsed.data.publishedAt }
        : {}),
    },
  });

  if (newFiles.length > 0) {
    try {
      await storeAttachments({
        files: newFiles,
        uploadedById: user.id,
        owner: { boardPostId: id },
      });
    } catch (e) {
      if (e instanceof UploadError) return { ok: false, message: "Ek dosya reddedildi." };
      throw e;
    }
  }

  if (removeRows.length > 0) {
    await prisma.attachment.deleteMany({
      where: { id: { in: removeRows.map((a) => a.id) }, boardPostId: id },
    });
    await Promise.allSettled(removeRows.map((a) => storage.remove(a.storageKey)));
  }

  await audit({
    action: "BOARD_POST_UPDATED",
    actorId: user.id,
    targetType: "BoardPost",
    targetId: id,
    metadata: {
      addedFiles: newFiles.length,
      removedFiles: removeRows.length,
    },
  });

  revalidatePath(post.scope === "GENERAL" ? "/panolar/genel" : "/panolar/grup");
  revalidatePath("/calisma-grubum");
  revalidatePath("/panel");
  return OK;
}

/** Toggle pin state. Admins: anywhere. Moderators: only in own group. */
export async function togglePin(id: string): Promise<void> {
  const user = await requireActiveUser();
  const post = await prisma.boardPost.findUnique({ where: { id } });
  if (!post || post.deletedAt) redirect("/panolar");

  if (post.scope === "GENERAL" && !isAdmin(user)) await redirectUnauthorized();
  if (post.scope === "GROUP") {
    const sameGroup = post.groupId && post.groupId === user.groupId;
    if (!isAdmin(user) && !(isModerator(user) && sameGroup)) await redirectUnauthorized();
  }

  await prisma.boardPost.update({
    where: { id },
    data: { pinned: !post.pinned },
  });

  await audit({
    action: "BOARD_POST_UPDATED",
    actorId: user.id,
    targetType: "BoardPost",
    targetId: id,
    metadata: { pinned: !post.pinned },
  });

  revalidatePath(post.scope === "GENERAL" ? "/panolar/genel" : "/panolar/grup");
}

/** Soft-delete a post. Author, group moderator, or admin can remove. */
export async function removeBoardPost(id: string): Promise<void> {
  const user = await requireActiveUser();
  const post = await prisma.boardPost.findUnique({ where: { id } });
  if (!post || post.deletedAt) redirect("/panolar");

  const isAuthor = post.authorId === user.id;
  const isGroupMod =
    post.scope === "GROUP" && isModerator(user) && post.groupId === user.groupId;
  if (!isAuthor && !isGroupMod && !isAdmin(user)) await redirectUnauthorized();

  await prisma.boardPost.update({
    where: { id },
    data: { deletedAt: new Date(), status: "REMOVED" },
  });

  await audit({
    action: "BOARD_POST_REMOVED",
    actorId: user.id,
    targetType: "BoardPost",
    targetId: id,
  });

  revalidatePath(post.scope === "GENERAL" ? "/panolar/genel" : "/panolar/grup");
}
