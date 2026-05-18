"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateNotice, isAdmin } from "@/lib/rbac";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { MAX_ATTACHMENTS_PER_REQUEST, UploadError, storeAttachments } from "@/lib/upload";
import { noticeCreateSchema } from "./schemas";

export type NoticeFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

const OK: NoticeFormState = { ok: true };

function zodErrors(err: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Create a new notice. Role + group checks done server-side. */
export async function createNotice(
  _prev: NoticeFormState,
  fd: FormData,
): Promise<NoticeFormState> {
  const user = await requireActiveUser();

  // Rate-limit ile abuse koruması — moderatör/admin için de geçerli.
  const ip = await getClientIp();
  const rl = await rateLimit(`notice:${user.id}:${ip}`, 30, 10 * 60_000);
  if (!rl.allowed) {
    return { ok: false, message: "Çok fazla bildirim denemesi. Biraz sonra tekrar deneyin." };
  }

  const parsed = noticeCreateSchema.safeParse({
    scope: fd.get("scope"),
    groupId: fd.get("groupId"),
    title: fd.get("title"),
    body: fd.get("body"),
    eventAt: fd.get("eventAt"),
    pinned: fd.get("pinned"),
  });
  if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };

  // Sunucu tarafı yetki kontrolü — UI atlatılsa bile geçemez.
  const groupId = parsed.data.scope === "GROUP" ? (parsed.data.groupId ?? null) : null;
  if (!canCreateNotice(user, parsed.data.scope, groupId)) {
    return { ok: false, message: "Bu kapsamda bildirim oluşturma yetkiniz yok." };
  }

  // GROUP scope: group gerçekten var mı? (canCreateNotice grubu doğrulamıyor)
  if (parsed.data.scope === "GROUP" && groupId) {
    const exists = await prisma.group.findUnique({ where: { id: groupId }, select: { id: true } });
    if (!exists) return { ok: false, errors: { groupId: ["Grup bulunamadı."] } };
  }

  // Pin yetkisi = oluşturma yetkisi. Admin her kapsam, moderatör kendi
  // grubu için sabitleyebilir.
  const pinned = parsed.data.pinned && canCreateNotice(user, parsed.data.scope, groupId);

  const row = await prisma.notice.create({
    data: {
      scope: parsed.data.scope,
      title: parsed.data.title,
      body: parsed.data.body,
      eventAt: parsed.data.eventAt ?? null,
      pinned,
      authorId: user.id,
      groupId,
    },
  });

  // Ek dosya yükleme — hata olursa notice'i geri sar (cascade temizliği için
  // attachment kayıtları onDelete: Cascade ile birlikte düşer).
  try {
    const files = fd.getAll("attachments").filter((v): v is File => v instanceof File);
    await storeAttachments({
      files,
      uploadedById: user.id,
      owner: { noticeId: row.id },
    });
  } catch (e) {
    await prisma.notice.delete({ where: { id: row.id } });
    if (e instanceof UploadError) {
      const msg =
        e.code === "too_large"
          ? "Bir dosya izin verilen boyutu aşıyor."
          : e.code === "mime_not_allowed"
            ? "Bir dosyanın türü desteklenmiyor."
            : e.code === "too_many"
              ? `En fazla ${MAX_ATTACHMENTS_PER_REQUEST} dosya yükleyebilirsiniz.`
              : "Dosya yükleme başarısız.";
      return { ok: false, message: msg };
    }
    throw e;
  }

  await audit({
    action: "NOTICE_CREATED",
    actorId: user.id,
    targetType: "Notice",
    targetId: row.id,
    metadata: { scope: row.scope, groupId: row.groupId, pinned: row.pinned, eventAt: row.eventAt },
  });

  revalidatePath("/duyurular");
  revalidatePath("/panel");
  return OK;
}

/** Soft-delete a notice. Author, admin, or — for GROUP scope — same-group moderator. */
export async function removeNotice(id: string): Promise<void> {
  const user = await requireActiveUser();
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice || notice.deletedAt) redirect("/duyurular");

  const isAuthor = notice.authorId === user.id;
  const sameGroupMod =
    notice.scope === "GROUP" &&
    canCreateNotice(user, "GROUP", notice.groupId);

  if (!isAuthor && !isAdmin(user) && !sameGroupMod) redirect("/yetkisiz");

  await prisma.notice.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await audit({
    action: "NOTICE_REMOVED",
    actorId: user.id,
    targetType: "Notice",
    targetId: id,
  });

  revalidatePath("/duyurular");
  revalidatePath("/panel");
}

/** Toggle pin. Admin: her kapsam. Moderatör: kendi grubu için. */
export async function toggleNoticePin(id: string): Promise<void> {
  const user = await requireActiveUser();
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice || notice.deletedAt) redirect("/duyurular");

  // Pin/unpin yetkisi = oluşturma yetkisi ile aynı kapsama bağlı.
  if (!canCreateNotice(user, notice.scope, notice.groupId)) {
    redirect("/yetkisiz");
  }

  const next = !notice.pinned;
  await prisma.notice.update({ where: { id }, data: { pinned: next } });

  await audit({
    action: "NOTICE_UPDATED",
    actorId: user.id,
    targetType: "Notice",
    targetId: id,
    metadata: { pinned: next },
  });

  revalidatePath("/duyurular");
  revalidatePath("/panel");
}
