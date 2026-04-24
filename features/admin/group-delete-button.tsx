"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { deleteGroupAction } from "./group-actions";

/**
 * Confirmation-guarded delete button for a group. Surfaces member count
 * in the prompt so the admin knows the impact (users whose group is
 * deleted become groupless — Prisma `onDelete: SetNull`).
 */
export function GroupDeleteButton({
  id,
  code,
  userCount,
}: {
  id: string;
  code: string;
  userCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleDelete() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      try {
        await deleteGroupAction(fd);
        // deleteGroupAction redirects on success — this toast fires on
        // navigation-less code paths only (e.g. test harness).
        toast.success("Grup silindi.");
      } catch (e) {
        // Next's redirect throws a NEXT_REDIRECT Error which we let
        // propagate; any other error surfaces as a toast.
        if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
          throw e;
        }
        toast.error("Grup silinemedi.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Sil
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grup silinsin mi?</DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <span className="block">
              <span className="font-mono font-medium">{code}</span> grubu silinecek.
            </span>
            {userCount > 0 ? (
              <span className="block rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
                Bu grupta {userCount} üye var. Silme sonrası bu üyeler{" "}
                <strong>gruptan çıkmış</strong> olur (başka bir grup atanana kadar grup
                içeriklerine erişemezler).
              </span>
            ) : null}
            <span className="block text-xs">
              Grubun geçmiş kayıtları (toplantı, rapor, pano vs.) silinmez — sadece grup
              meta bilgisi ve ilişkilendirmeleri temizlenir.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Siliniyor…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Grubu sil
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
