"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { EditBoardPostDialog, type EditBoardPostInitial } from "./edit-post-dialog";
import { removeBoardPost } from "./actions";

/**
 * Yönetim panelindeki Çağrı/Hibe Duyuruları tablosunda her satır için
 * "Düzenle" (mevcut EditBoardPostDialog) + "Sil" (site stilli onaylı) butonları.
 *
 * Silme — site-uyumlu `ConfirmDialog`; soft-delete (geri alınabilir).
 */
export function AnnouncementRowActions({ post }: { post: EditBoardPostInitial }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <EditBoardPostDialog post={post} />
      <ConfirmDialog
        title="Duyuruyu sil"
        description={
          <>
            <span className="font-medium text-foreground">{post.title}</span>
            {" "}adlı Çağrı/Hibe Duyurusu listeden kaldırılacak. Bu işlem
            geri alınabilir (soft-delete); kayıt veritabanında korunur ama
            kullanıcılara görünmez.
          </>
        }
        confirmLabel="Sil"
        confirmVariant="destructive"
        onConfirm={async () => {
          await removeBoardPost(post.id);
        }}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Sil
        </Button>
      </ConfirmDialog>
    </div>
  );
}
