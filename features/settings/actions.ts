"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import {
  getNotificationPrefs,
  setNotificationPrefs,
} from "@/lib/notifications/notification-prefs";

export type SettingsFormState = {
  ok: boolean;
  message?: string;
};

const OK: SettingsFormState = { ok: true };

/**
 * Update the admin-controlled login/logout notification toggles. Reads
 * the current row, overlays only the fields submitted in this form, then
 * persists — that way adding a new toggle later doesn't risk wiping the
 * existing ones if the form omits them.
 */
export async function updateNotificationPrefs(
  _prev: SettingsFormState,
  fd: FormData,
): Promise<SettingsFormState> {
  const admin = await requireAdmin();

  const current = await getNotificationPrefs();
  const next = {
    loginNotificationsEnabled: fd.get("loginNotificationsEnabled") === "on",
    logoutNotificationsEnabled: fd.get("logoutNotificationsEnabled") === "on",
  };

  await setNotificationPrefs(next);
  await audit({
    action: "SETTINGS_CHANGED",
    actorId: admin.id,
    metadata: { change: "notification_prefs", before: current, after: next },
  });

  revalidatePath("/yonetim/ayarlar");
  return { ...OK, message: "Bildirim tercihleri güncellendi." };
}
