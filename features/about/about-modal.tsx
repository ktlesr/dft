"use client";

import * as React from "react";
import { ArrowRight, FileText, Paperclip, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AboutFile } from "./schemas";

type Props = {
  title: string;
  summary: string;
  body: string;
  attachments: AboutFile[];
  updatedAt: string;
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()) || d.getTime() === 0) return null;
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return null;
  }
}

export function AboutModal({ title, summary, body, attachments, updatedAt }: Props) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updated = mounted ? formatDate(updatedAt) : null;

  return (
    <>
      <Button
        type="button"
        variant="brand"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-start shadow-sm"
      >
        Devamı
        <ArrowRight className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-3xl overflow-hidden p-0 sm:rounded-2xl">
          {/* Premium başlık — marka gradient şeridi */}
          <div className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 px-6 pb-5 pt-6 sm:px-8 sm:pt-8">
            <DialogHeader className="space-y-2">
              <Badge variant="success" className="w-fit">
                DFT Hakkında
              </Badge>
              <DialogTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {title}
              </DialogTitle>
              {summary ? (
                <DialogDescription className="max-w-2xl text-sm leading-relaxed">
                  {summary}
                </DialogDescription>
              ) : null}
            </DialogHeader>
          </div>

          {/* Gövde — kaydırılabilir alan */}
          <div className="max-h-[55vh] overflow-y-auto px-6 py-5 sm:px-8">
            {/* Düz metin satır sonları korunsun */}
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground dark:prose-invert">
              {body}
            </div>

            {attachments.length > 0 ? (
              <div className="mt-8">
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Belgeler
                </h3>
                <ul className="divide-y rounded-lg border">
                  {attachments.map((f) => (
                    <li key={f.storageKey} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <a
                        href={`/api/dft-hakkinda/dosya/${encodeURIComponent(f.storageKey)}`}
                        className="min-w-0 flex-1 truncate font-medium hover:text-primary"
                        rel="noreferrer"
                      >
                        {f.originalName}
                      </a>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {humanSize(f.size)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {updated ? (
              <p className="mt-6 text-[11px] text-muted-foreground">
                Son güncelleme: {updated}
              </p>
            ) : null}
          </div>

          {/* Alt çubuk */}
          <div className="flex items-center justify-between border-t bg-muted/30 px-6 py-3 sm:px-8">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              {attachments.length} belge
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
