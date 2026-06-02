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
  /** "cover": karttaki büyük kapak. "thumb": kapak altındaki küçük ek resimler. */
  size?: "cover" | "thumb";
};

const SIZE_CLASS: Record<NonNullable<CoverImageLightboxProps["size"]>, string> = {
  cover: "w-full h-48 sm:h-48 sm:w-48",
  thumb: "h-20 w-20 sm:h-24 sm:w-24",
};

export function CoverImageLightbox({
  src,
  alt,
  externalUrl,
  size = "cover",
}: CoverImageLightboxProps) {
  const thumb = (
    // The whole image is shown un-cropped (object-contain); a blurred, zoomed
    // copy of itself fills the frame behind it so wide logos / banners and tall
    // photos alike sit smoothly with no empty bars.
    <div className={`relative overflow-hidden ${SIZE_CLASS[size]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl saturate-150"
        loading="lazy"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain p-1.5 transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        loading="lazy"
      />
    </div>
  );

  const wrapperClass = `group block shrink-0 overflow-hidden rounded-md border bg-muted ${
    size === "cover" ? "w-full sm:w-auto sm:self-start" : "self-start"
  }`;

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={wrapperClass}
        title="Detaylı bilgi için tıklayın"
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
          className={`${wrapperClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
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
