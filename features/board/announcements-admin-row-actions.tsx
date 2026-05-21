"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EditBoardPostDialog, type EditBoardPostInitial } from "./edit-post-dialog";
import { removeBoardPost } from "./actions";

/**
 * Yönetim panelindeki Çağrı/Hibe Duyuruları tablosunda her satır için
 * "Düzenle" (mevcut EditBoardPostDialog) + "Sil" (onaylı) butonları.
 *
 * Silme — confirm() ile bir kez sorar; soft-delete (geri alınabilir).
 */
export function AnnouncementRowActions({ post }: { post: EditBoardPostInitial }) {
  const [pending, startTransition] = React.useTransition();

  const onRemove = () => {
    if (!confirm(`"${post.title}" duyurusunu silmek istediğinize emin misiniz?`)) return;
    startTransition(async () => {
      await removeBoardPost(post.id);
    });
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <EditBoardPostDialog post={post} />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={pending}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Sil
      </Button>
    </div>
  );
}
