"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GroupSelect } from "./group-select";
import { changeUserGroup } from "./user-actions";
import type { GroupCode } from "@prisma/client";

/**
 * Small client wrapper around the admin "change group" form. The server
 * action itself (`changeUserGroup`) returns void + revalidates the page
 * — UI feedback is surfaced here via a sonner toast and the usual
 * pending state on the submit button.
 */
export function UserGroupForm({
  userId,
  defaultCode,
}: {
  userId: string;
  defaultCode: GroupCode | null;
}) {
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      try {
        await changeUserGroup(fd);
        toast.success("Kullanıcı grubu güncellendi.");
      } catch {
        toast.error("Grup güncellenemedi. Tekrar deneyin.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <GroupSelect name="groupCode" defaultCode={defaultCode} />
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Güncelleniyor…
          </>
        ) : (
          "Grubu güncelle"
        )}
      </Button>
    </form>
  );
}
