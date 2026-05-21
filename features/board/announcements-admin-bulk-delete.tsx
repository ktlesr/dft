"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { removeAllAnnouncements } from "./actions";

/**
 * "Hepsini sil" butonu. Site-uyumlu `ConfirmDialog` ile tek bir net
 * onay ekranı gösterir — total sayı, soft-delete açıklaması ve net
 * destructive aksiyon. Native `confirm()` kullanımı kaldırıldı.
 *
 * Soft-delete: tüm satırlar `deletedAt` + `status=REMOVED` ile işaretlenir;
 * row'lar DB'de korunur.
 */
export function AnnouncementsBulkDeleteButton({ total }: { total: number }) {
  if (total === 0) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <Trash2 className="h-3.5 w-3.5" />
        Hepsini sil
      </Button>
    );
  }

  return (
    <ConfirmDialog
      title="Tüm Çağrı/Hibe Duyurularını sil"
      description={
        <>
          <span className="font-medium text-foreground">{total} kayıt</span>
          {" "}listeden kaldırılacak. Bu işlem soft-delete'dir — kayıtlar
          veritabanında korunur, gerekirse SQL ile geri yüklenebilir; ancak
          listede ve kullanıcı tarafında hepsi görünmez olur.
        </>
      }
      confirmLabel={`Hepsini sil (${total})`}
      confirmVariant="destructive"
      onConfirm={async () => {
        await removeAllAnnouncements();
      }}
    >
      <Button type="button" variant="destructive" size="sm">
        <Trash2 className="h-3.5 w-3.5" />
        Hepsini sil ({total})
      </Button>
    </ConfirmDialog>
  );
}
