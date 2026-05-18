"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin, isModerator } from "@/lib/rbac";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { discussionCreateSchema, replyCreateSchema } from "./schemas";

export type ForumFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: ForumFormState = { ok: true };

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * Yeni tartışma başlatma — gruplu her aktif üye yapabilir.
 * `pinned` yalnızca admin için geçerli; diğerleri yollasa da yok sayılır.
 */
export async function createDiscussion(
  _prev: ForumFormState,
  fd: FormData,
): Promise<ForumFormState> {
  const user = await requireActiveUser();
  if (!user.groupId) {
    return {
      ok: false,
      message: "Tartışma başlatmak için bir çalışma grubuna atanmış olmanız gerekir.",
    };
  }

  // Abuse koruması — admin/moderatör için de geçerli, anlamlı tavan.
  const ip = await getClientIp();
  const rl = await rateLimit(`forum:create:${user.id}:${ip}`, 20, 10 * 60_000);
  if (!rl.allowed) {
    return { ok: false, message: "Çok fazla tartışma denemesi. Biraz sonra tekrar deneyin." };
  }

  const parsed = discussionCreateSchema.safeParse({
    title: fd.get("title"),
    body: fd.get("body"),
    pinned: fd.get("pinned"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const pinned = parsed.data.pinned && isAdmin(user);

  const row = await prisma.discussion.create({
    data: {
      groupId: user.groupId,
      authorId: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      pinned,
    },
  });

  await audit({
    action: "DISCUSSION_CREATED",
    actorId: user.id,
    targetType: "Discussion",
    targetId: row.id,
    metadata: { groupId: user.groupId, pinned },
  });

  revalidatePath("/calisma-grubum");
  revalidatePath(`/forum/${row.id}`);
  redirect(`/forum/${row.id}`);
}

/**
 * Bir tartışmaya yanıt — aynı grubun üyesi (veya admin) yanıt yazabilir.
 * Tartışma `locked` ise yalnızca admin/moderatör yanıt verebilir.
 */
export async function replyToDiscussion(
  _prev: ForumFormState,
  fd: FormData,
): Promise<ForumFormState> {
  const user = await requireActiveUser();

  const parsed = replyCreateSchema.safeParse({
    discussionId: fd.get("discussionId"),
    body: fd.get("body"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  const discussion = await prisma.discussion.findUnique({
    where: { id: parsed.data.discussionId },
    select: { id: true, groupId: true, deletedAt: true, locked: true },
  });
  if (!discussion || discussion.deletedAt) {
    return { ok: false, message: "Tartışma bulunamadı." };
  }

  // Aynı gruba aitlik kontrolü — admin tüm gruplarda yanıt verebilir.
  if (!isAdmin(user) && discussion.groupId !== user.groupId) {
    return { ok: false, message: "Bu tartışmaya yanıt verme yetkiniz yok." };
  }

  // Kilitliyse: yalnızca admin/moderatör (kendi grubunda) yazabilir.
  if (discussion.locked) {
    const isGroupMod = isModerator(user) && discussion.groupId === user.groupId;
    if (!isAdmin(user) && !isGroupMod) {
      return { ok: false, message: "Bu tartışma yanıtlara kapalı." };
    }
  }

  // Rate limit
  const ip = await getClientIp();
  const rl = await rateLimit(`forum:reply:${user.id}:${ip}`, 60, 10 * 60_000);
  if (!rl.allowed) {
    return { ok: false, message: "Çok fazla yanıt denemesi. Biraz sonra tekrar deneyin." };
  }

  const reply = await prisma.discussionReply.create({
    data: {
      discussionId: discussion.id,
      authorId: user.id,
      body: parsed.data.body,
    },
  });

  // updatedAt'i tetikle ki son cevaba göre listeleme çalışsın.
  await prisma.discussion.update({
    where: { id: discussion.id },
    data: { updatedAt: new Date() },
  });

  await audit({
    action: "DISCUSSION_REPLY_CREATED",
    actorId: user.id,
    targetType: "DiscussionReply",
    targetId: reply.id,
    metadata: { discussionId: discussion.id },
  });

  revalidatePath(`/forum/${discussion.id}`);
  revalidatePath("/calisma-grubum");
  return OK;
}

/** Tartışma silme — yazar, grup moderatörü veya admin. Soft delete. */
export async function removeDiscussion(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const id = String(formData.get("discussionId") ?? "");
  const discussion = await prisma.discussion.findUnique({
    where: { id },
    select: { id: true, authorId: true, groupId: true, deletedAt: true },
  });
  if (!discussion || discussion.deletedAt) redirect("/calisma-grubum");

  const isAuthor = discussion.authorId === user.id;
  const sameGroupMod = isModerator(user) && discussion.groupId === user.groupId;
  if (!isAuthor && !sameGroupMod && !isAdmin(user)) redirect("/yetkisiz");

  await prisma.discussion.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit({
    action: "DISCUSSION_REMOVED",
    actorId: user.id,
    targetType: "Discussion",
    targetId: id,
  });

  revalidatePath("/calisma-grubum");
  redirect("/calisma-grubum?forum=silindi");
}

/** Yanıt silme — yazar, grup moderatörü veya admin. Soft delete. */
export async function removeReply(formData: FormData): Promise<void> {
  const user = await requireActiveUser();
  const id = String(formData.get("replyId") ?? "");
  const reply = await prisma.discussionReply.findUnique({
    where: { id },
    include: { discussion: { select: { id: true, groupId: true } } },
  });
  if (!reply || reply.deletedAt) redirect("/calisma-grubum");

  const isAuthor = reply.authorId === user.id;
  const sameGroupMod = isModerator(user) && reply.discussion.groupId === user.groupId;
  if (!isAuthor && !sameGroupMod && !isAdmin(user)) redirect("/yetkisiz");

  await prisma.discussionReply.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit({
    action: "DISCUSSION_REPLY_REMOVED",
    actorId: user.id,
    targetType: "DiscussionReply",
    targetId: id,
    metadata: { discussionId: reply.discussion.id },
  });

  revalidatePath(`/forum/${reply.discussion.id}`);
}
