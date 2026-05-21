import "server-only";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

/**
 * Admin-controlled toggles for notification kinds that may produce volume
 * a sysadmin wants to mute. Today only login/logout — future flags should
 * be added to the same schema so the settings page renders them uniformly.
 *
 * Stored as a JSON blob on the singleton `AppSetting` row with key
 * `notification_prefs`. Defaults bake conservative behavior: login on,
 * logout off (logout was never wired before this — keeping it opt-in
 * avoids surprise noise after deploy).
 */
export const NOTIFICATION_PREFS_KEY = "notification_prefs";

export const notificationPrefsSchema = z.object({
  loginNotificationsEnabled: z.boolean(),
  logoutNotificationsEnabled: z.boolean(),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  loginNotificationsEnabled: true,
  logoutNotificationsEnabled: false,
};

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const row = await prisma.appSetting.findUnique({
    where: { key: NOTIFICATION_PREFS_KEY },
  });
  if (!row) return DEFAULT_NOTIFICATION_PREFS;
  const parsed = notificationPrefsSchema.safeParse(row.value);
  return parsed.success ? parsed.data : DEFAULT_NOTIFICATION_PREFS;
}

export async function setNotificationPrefs(next: NotificationPrefs): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: NOTIFICATION_PREFS_KEY },
    create: { key: NOTIFICATION_PREFS_KEY, value: next },
    update: { value: next },
  });
}
