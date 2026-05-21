"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { removeAllAnnouncements } from "./actions";

/**
 * "Hepsini sil" butonu. İki onay aşaması — yanlışlıkla tıklamayı önlemek
 * için kullanıcının kayıt adetini görerek onaylaması gerekiyor.
 *
 * Soft-delete: tüm satırlar `deletedAt` + `status=REMOVED` ile işaretlenir;
 * row'lar DB'de korunur (gerekiyorsa SQL ile geri yüklenebilir).
 */
export function AnnouncementsBulkDeleteButton({ total }: { total: number }) {
  const [pending, startTransition] = React.useTransition();

  if (total === 0) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <Trash2 className="h-3.5 w-3.5" />
        Hepsini sil
      </Button>
    );
  }

  const onClick = () => {
    if (
      !confirm(
        `Tüm Çağrı/Hibe Duyuruları silinecek (${total} kayıt). Bu işlem soft-delete'dir ama listeden hepsi kalkar. Devam edilsin mi?`,
      )
    )
      return;
    if (
      !confirm(
        `Son onay: ${total} kayıt silinecek. Bu işlemi yapmak istediğinize emin misiniz?`,
      )
    )
      return;

    startTransition(async () => {
      await removeAllAnnouncements();
    });
  };

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Siliniyor…" : `Hepsini sil (${total})`}
    </Button>
  );
}
