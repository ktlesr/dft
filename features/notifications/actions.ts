"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function markAllRead(): Promise<void> {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/bildirimler");
  revalidatePath("/panel");
}

export async function markOneRead(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/bildirimler");
}
