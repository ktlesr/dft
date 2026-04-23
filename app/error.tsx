"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side structured logging happens on the API boundary; this is a UX surface.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Bir hata oluştu</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          İşleminiz tamamlanamadı. Sorun devam ederse yöneticiyle iletişime geçin.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">Kod: {error.digest}</p>
        ) : null}
        <div className="mt-6">
          <Button onClick={reset} variant="brand">
            Tekrar dene
          </Button>
        </div>
      </div>
    </div>
  );
}
