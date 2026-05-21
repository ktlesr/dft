"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ButtonVariant = React.ComponentProps<typeof Button>["variant"];

/**
 * Site stiliyle uyumlu, yeniden kullanılabilir onay diyaloğu.
 * Tarayıcının native `confirm()` penceresinin yerini alır.
 *
 * - `children` → tetikleyici (örn. bir `<Button>`)
 * - `onConfirm` → async olabilir; çalışırken buton "Yükleniyor..." gösterir
 * - İşlem başarıyla tamamlanırsa dialog otomatik kapanır; hata fırlatırsa
 *   açık kalır ki kullanıcı tekrar deneyebilsin
 */
export function ConfirmDialog({
  children,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  confirmVariant = "default",
  onConfirm,
}: {
  children: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await onConfirm();
        setOpen(false);
      } catch {
        // dialog açık kalır → kullanıcı tekrar deneyebilir
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!pending ? setOpen(next) : null)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                İşleniyor…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
