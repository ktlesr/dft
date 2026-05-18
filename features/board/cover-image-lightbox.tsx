"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CoverImageLightboxProps = {
  src: string;
  alt: string;
  /** Harici bağlantı varsa: lightbox yerine yeni sekmede o URL açılır. */
  externalUrl?: string | null;
};

export function CoverImageLightbox({ src, alt, externalUrl }: CoverImageLightboxProps) {
  const thumb = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className="h-44 w-44 object-cover transition-transform group-hover:scale-[1.02] sm:h-48 sm:w-48"
      loading="lazy"
    />
  );

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group block shrink-0 self-start overflow-hidden rounded-md border bg-muted"
        title="Harici bağlantıyı aç"
      >
        {thumb}
      </a>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group block shrink-0 self-start overflow-hidden rounded-md border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={`${alt} — büyüt`}
        >
          {thumb}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[95vh] w-auto max-w-[95vw] gap-0 border-0 bg-transparent p-0 shadow-none sm:rounded-none">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[95vh] max-w-[95vw] rounded-md object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
