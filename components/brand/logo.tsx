import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Official DFT logo — served from /public/dft-logo.svg.
 *
 * The SVG was modified so that paths without an explicit class inherit
 * `currentColor`; the brand-colored accents (green #00bd8d, blue #0060ab)
 * stay fixed. This makes the wordmark adapt to light/dark theme via the
 * surrounding text color.
 *
 * Native aspect ratio is ~2.39:1 (viewBox 1555.78 × 652.11). Callers
 * size via height classes; width scales automatically.
 */

const LOGO_SRC = "/dft-logo.svg";
const VERTICAL_LOGO_SRC = "/yesil-dft.svg";
const LOGO_ALT = "DFT — Kapalı Portal";

type LockupProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
};

/**
 * Compact brand mark. Currently wraps the same logotype at a small height;
 * swap for an icon-only SVG later if an extracted glyph becomes available.
 */
export function BrandMark({ className, title = LOGO_ALT }: { className?: string; title?: string }) {
  return (
    <span className={cn("inline-flex h-7 items-center text-foreground", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt={title} className="block h-full w-auto select-none" />
    </span>
  );
}

/**
 * Primary wordmark used in header, sidebar, auth layout and landing.
 * `text-foreground` on the wrapper feeds `currentColor` into the SVG so
 * the inscription remains legible in both themes.
 */
export function BrandLockup({ className, size = "md", title = LOGO_ALT }: LockupProps) {
  const heightClass = size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-10";
  return (
    <span className={cn("inline-flex items-center text-foreground", heightClass, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_SRC} alt={title} className="block h-full w-auto select-none" />
    </span>
  );
}

/**
 * Vertical ("yesil") DFT lockup — big globe icon + DFT letters + subtitle.
 * Used on auth screens (login, signup) where the brand should dominate
 * above a centred content card. Aspect ratio is roughly 0.92:1
 * (991.32 × 1081.55). Size via explicit height class on `className`.
 */
export function BrandVertical({
  className,
  title = LOGO_ALT,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span className={cn("inline-flex items-center justify-center text-foreground", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={VERTICAL_LOGO_SRC} alt={title} className="block h-full w-auto select-none" />
    </span>
  );
}
