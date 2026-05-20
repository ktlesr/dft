"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Click-to-zoom wrapper for user avatars.
 *
 * The trigger renders the small avatar (children). On click → a centered
 * lightbox dialog opens with the 1024px webp variant. Backdrop click,
 * ESC, and the close button all dismiss (Radix Dialog handles backdrop +
 * ESC out of the box).
 *
 * `largeSrc` may be undefined when the user has no photo at all — in that
 * case we render children directly without a trigger so the surrounding
 * UI (fallback initials, etc.) keeps working.
 */
export function AvatarLightbox({
  children,
  largeSrc,
  alt,
  className,
}: {
  children: React.ReactNode;
  largeSrc?: string;
  alt: string;
  className?: string;
}) {
  if (!largeSrc) {
    return <>{children}</>;
  }

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`${alt} — büyüt`}
          className={cn(
            "group inline-flex cursor-zoom-in rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
        >
          {children}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "outline-none",
          )}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          {/* Image gets its own focus so screen readers can navigate; the
              button next to it is the explicit close affordance. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={largeSrc}
            alt={alt}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
          <DialogPrimitive.Close
            className="absolute -right-3 -top-3 rounded-full bg-background p-1.5 text-foreground shadow-lg ring-1 ring-border transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
