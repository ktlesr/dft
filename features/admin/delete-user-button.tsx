"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteUserByAdmin } from "./user-actions";

/**
 * Silme öncesi native `confirm()` ile sade bir koruma. AlertDialog'a
 * yükseltmek için bir adım yeterli — şimdilik klavye dostu ve en basit
 * yaklaşım.
 */
export function DeleteUserButton({
  userId,
  userName,
  compact = false,
}: {
  userId: string;
  userName: string;
  /** Liste satırında küçük "Sil" varyantı; false (varsayılan) tam metin. */
  compact?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteUserByAdmin} className={compact ? "inline" : undefined}>
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="button"
        size={compact ? "sm" : undefined}
        variant={compact ? "ghost" : "outline"}
        className={
          compact
            ? "h-8 px-2 text-destructive hover:text-destructive"
            : "text-destructive hover:text-destructive"
        }
        onClick={() => {
          const ok = window.confirm(
            `"${userName}" hesabını ve bu hesaba ait tüm kayıtları kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`,
          );
          if (ok) formRef.current?.requestSubmit();
        }}
        title={compact ? "Hesabı kalıcı olarak sil" : undefined}
      >
        <Trash2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {compact ? "Sil" : "Hesabı kalıcı olarak sil"}
      </Button>
    </form>
  );
}
