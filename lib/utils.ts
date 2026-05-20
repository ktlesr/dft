import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...opts,
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined) {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name?: string | null, email?: string | null) {
  const src = (name ?? email ?? "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function truncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Resolve `User.image` to a URL renderable by `<img>` / `<AvatarImage>`.
 * Modern (Faz 6+) uploads store the value as `storage:<key>`, which
 * points to the private `/api/profil/foto/{userId}` endpoint. Legacy
 * Google-OAuth images were absolute URLs — left unchanged.
 */
export function avatarUrl(userId: string, image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("storage:")) {
    // Cache-bust on the stored key so a new upload invalidates the browser cache.
    return `/api/profil/foto/${userId}?v=${encodeURIComponent(image.slice("storage:".length))}`;
  }
  return image;
}

/**
 * Lightbox sürümü için 1024px webp URL'i. Eski uploads'larda backend
 * otomatik küçük resme düşer. Cache-bust için `image` (avatar key) yeterli
 * çünkü ikiz yüklemede her iki dosya da aynı anda yenilenir.
 */
export function avatarUrlLarge(userId: string, image: string | null | undefined): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("storage:")) {
    return `/api/profil/foto/${userId}?size=lg&v=${encodeURIComponent(image.slice("storage:".length))}`;
  }
  return image;
}
