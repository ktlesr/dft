"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin, isModerator } from "@/lib/rbac";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { UploadError, storeAttachments } from "@/lib/upload";
import { boardPostSchema } from "./schemas";

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
    externalUrl: fd.get("externalUrl"),
    tags: fd.get("tags"),
    pinned: fd.get("pinned"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  // Group-scoped posts require a group membership; general posts are open.
  if (parsed.data.scope === "GROUP" && !user.groupId) {
    return { ok: false, message: "Çalışma grubunuz atanmadığı için grup panosuna paylaşım yapamazsınız." };
  }

  const pinned = parsed.data.pinned && canPinIn(parsed.data.scope, user);

  const row = await prisma.boardPost.create({
    data: {
      scope: parsed.data.scope,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body,
      tags: parsed.data.tags,
      externalUrl: parsed.data.externalUrl ?? null,
      pinned,
      status: "PUBLISHED",
      authorId: user.id,
      groupId: parsed.data.scope === "GROUP" ? user.groupId : null,
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
  revalidatePath("/panel");
  return OK;
}

/** Toggle pin state. Admins: anywhere. Moderators: only in own group. */
export async function togglePin(id: string): Promise<void> {
  const user = await requireActiveUser();
  const post = await prisma.boardPost.findUnique({ where: { id } });
  if (!post || post.deletedAt) redirect("/panolar");

  if (post.scope === "GENERAL" && !isAdmin(user)) redirect("/yetkisiz");
  if (post.scope === "GROUP") {
    const sameGroup = post.groupId && post.groupId === user.groupId;
    if (!isAdmin(user) && !(isModerator(user) && sameGroup)) redirect("/yetkisiz");
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
  if (!isAuthor && !isGroupMod && !isAdmin(user)) redirect("/yetkisiz");

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
