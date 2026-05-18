"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteUserByAdmin } from "./user-actions";

type Props = {
  userId: string;
  userName: string;
  /** Liste satırında küçük "Sil" varyantı; false (varsayılan) tam metin. */
  compact?: boolean;
};

export function DeleteUserButton({ userId, userName, compact = false }: Props) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size={compact ? "sm" : undefined}
        variant={compact ? "ghost" : "outline"}
        className={
          compact
            ? "h-8 px-2 text-destructive hover:text-destructive"
            : "text-destructive hover:text-destructive"
        }
        onClick={() => setOpen(true)}
        title={compact ? "Hesabı kalıcı olarak sil" : undefined}
      >
        <Trash2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {compact ? "Sil" : "Hesabı kalıcı olarak sil"}
      </Button>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="mt-3">Hesabı kalıcı olarak silmek istediğinize emin misiniz?</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              <span className="font-semibold text-foreground">{userName}</span> hesabı ve bu
              hesaba ait tüm kayıtlar (proje, etkinlik, pano paylaşımları, toplantılar,
              tutanaklar, raporlar, paydaşlar, dijital içerikler vb.) silinecek.
            </span>
            <span className="block font-medium text-destructive">Bu işlem geri alınamaz.</span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-2 sm:gap-2">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={pending}>
              Vazgeç
            </Button>
          </DialogClose>
          <form
            action={(fd: FormData) => {
              startTransition(() => deleteUserByAdmin(fd));
            }}
          >
            <input type="hidden" name="userId" value={userId} />
            <Button
              type="submit"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Siliniyor…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Evet, sil
                </>
              )}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
