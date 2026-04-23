"use client";

import * as React from "react";
import { Paperclip, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_ATTACHMENTS_PER_REQUEST,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";

const ACCEPT = Array.from(ALLOWED_UPLOAD_MIME).join(",");

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentInput({
  name = "attachments",
  className,
  disabled,
}: {
  name?: string;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<File[]>([]);

  const sync = (next: File[]) => {
    setFiles(next);
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const combined = [...files, ...list].slice(0, MAX_ATTACHMENTS_PER_REQUEST);
    sync(combined);
  };

  const remove = (idx: number) => {
    sync(files.filter((_, i) => i !== idx));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <button
          type="button"
          disabled={disabled || files.length >= MAX_ATTACHMENTS_PER_REQUEST}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip className="h-4 w-4" />
          <span>Dosya ekle</span>
          <span className="text-[11px] text-muted-foreground/80">
            · en çok {MAX_ATTACHMENTS_PER_REQUEST} · her biri ≤ {Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          name={name}
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={onPick}
          disabled={disabled}
        />
      </div>

      {files.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {files.map((f, idx) => {
            const tooLarge = f.size > MAX_UPLOAD_BYTES;
            const badMime = !ALLOWED_UPLOAD_MIME.has(f.type);
            const invalid = tooLarge || badMime;
            return (
              <li key={`${f.name}-${idx}`} className="flex items-center gap-3 px-3 py-2">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{f.name}</p>
                  <p
                    className={cn(
                      "text-[11px] text-muted-foreground",
                      invalid && "text-destructive",
                    )}
                  >
                    {formatBytes(f.size)}
                    {badMime ? " · dosya türü desteklenmiyor" : ""}
                    {tooLarge ? " · boyut limiti aşıldı" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`${f.name} kaldır`}
                  onClick={() => remove(idx)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
