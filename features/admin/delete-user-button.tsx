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
export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteUserByAdmin}>
      <input type="hidden" name="userId" value={userId} />
      <Button
        type="button"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => {
          const ok = window.confirm(
            `"${userName}" hesabını ve bu hesaba ait tüm kayıtları kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz.`,
          );
          if (ok) formRef.current?.requestSubmit();
        }}
      >
        <Trash2 className="h-4 w-4" />
        Hesabı kalıcı olarak sil
      </Button>
    </form>
  );
}
