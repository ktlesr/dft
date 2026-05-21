import "server-only";

import { prisma } from "@/lib/prisma";
import {
  APP_SETTING_KEY,
  DEFAULT_ABOUT,
  aboutContentSchema,
  type AboutContent,
} from "./schemas";

/**
 * Read the persisted "DFT Hakkında" content. Returns a safe fallback
 * when the row is missing or the stored JSON fails validation, so the
 * page never crashes due to a malformed setting.
 */
export async function getAboutContent(): Promise<AboutContent> {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEY },
  });
  if (!row) return DEFAULT_ABOUT;

  const parsed = aboutContentSchema.safeParse(row.value);
  return parsed.success ? parsed.data : DEFAULT_ABOUT;
}

/**
 * Cheap projection used by the download route to confirm a requested
 * `storageKey` is one of the keys we authored — defence against arbitrary
 * key access on the storage backend.
 */
export async function listAboutStorageKeys(): Promise<Set<string>> {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEY },
  });
  if (!row) return new Set();
  const parsed = aboutContentSchema.safeParse(row.value);
  if (!parsed.success) return new Set();
  return new Set(parsed.data.attachments.map((a) => a.storageKey));
}

/**
 * Resolve the persisted metadata for a given storage key — used by the
 * download route to set Content-Disposition / Content-Type from the
 * **uploaded** filename + MIME, not from the on-disk hash filename which
 * has no extension (causing browsers to save "abc123..." with no
 * extension). Returns null if the key isn't part of the about content.
 */
export async function findAboutFile(
  storageKey: string,
): Promise<{ originalName: string; mimeType: string; size: number } | null> {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEY },
  });
  if (!row) return null;
  const parsed = aboutContentSchema.safeParse(row.value);
  if (!parsed.success) return null;
  const hit = parsed.data.attachments.find((a) => a.storageKey === storageKey);
  return hit
    ? { originalName: hit.originalName, mimeType: hit.mimeType, size: hit.size }
    : null;
}
