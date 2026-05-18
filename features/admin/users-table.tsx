"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, CheckSquare, Loader2, Square, Trash2, XCircle, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserCard, type UserCardData } from "@/features/users/user-card";
import type { Role, UserStatus } from "@prisma/client";

import { DeleteUserButton } from "./delete-user-button";
import { approveUser, bulkDeleteUsersByAdmin, rejectUser } from "./user-actions";

export type UsersTableUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  status: UserStatus;
  createdAt: Date;
  roles: { role: Role }[];
  group: { code: string; description: string | null } | null;
  profile: {
    title: string | null;
    position: string | null;
    organization: string | null;
    phone: string | null;
    city: string | null;
    expertise: string[];
  } | null;
};

type Props = {
  users: UsersTableUser[];
  adminId: string;
};

export function UsersTableClient({ users, adminId }: Props) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  // Seçilebilir kullanıcılar — admin'in kendisi hariç.
  const selectableIds = React.useMemo(
    () => users.filter((u) => u.id !== adminId).map((u) => u.id),
    [users, adminId],
  );
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  };

  const toggleOne = (id: string, checked: boolean | "indeterminate") => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked === true) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkSubmit = (fd: FormData) => {
    startTransition(() => bulkDeleteUsersByAdmin(fd));
    setBulkDialogOpen(false);
    setSelected(new Set());
  };

  return (
    <div>
      {/* Toolbar — seçim yokken "Tümünü seç", varken toplu aksiyon */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2">
        <div className="flex items-center gap-2 text-sm">
          {someSelected ? (
            <>
              <Badge variant="success" className="font-medium">
                {selected.size}
              </Badge>
              <span>kullanıcı seçildi</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {users.length} kullanıcı listeleniyor
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectableIds.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleAll}
              className="h-8"
            >
              {allSelected ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  Seçimi kaldır
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Tümünü seç
                </>
              )}
            </Button>
          ) : null}
          {someSelected ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8"
              >
                <X className="h-3.5 w-3.5" />
                Temizle
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-destructive hover:text-destructive"
                onClick={() => setBulkDialogOpen(true)}
                disabled={pending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Seçilenleri sil
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Kart grid'i */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {users.map((u) => {
          const isSelf = u.id === adminId;
          const isSelected = selected.has(u.id);
          const cardUser: UserCardData = {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.image,
            status: u.status,
            createdAt: u.createdAt,
            roles: u.roles,
            group: u.group,
            profile: u.profile,
          };
          return (
            <UserCard
              key={u.id}
              user={cardUser}
              variant="admin"
              selected={isSelected}
              topLeftSlot={
                !isSelf ? (
                  <div className="rounded-md bg-background/90 p-1 shadow-sm backdrop-blur-sm">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(c) => toggleOne(u.id, c)}
                      aria-label={`${u.name ?? u.email} seç`}
                    />
                  </div>
                ) : null
              }
              actions={
                <>
                  {u.status === "PENDING_APPROVAL" ? (
                    <>
                      <form action={approveUser}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="accent"
                          className="h-8 px-2"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Onayla
                        </Button>
                      </form>
                      <form action={rejectUser}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reddet
                        </Button>
                      </form>
                    </>
                  ) : (
                    <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                      <Link href={`/yonetim/kullanicilar/${u.id}`}>Detay</Link>
                    </Button>
                  )}
                  {!isSelf ? (
                    <DeleteUserButton
                      userId={u.id}
                      userName={u.name ?? u.email}
                      compact
                    />
                  ) : null}
                </>
              }
            />
          );
        })}
      </div>

      {/* Toplu silme onay dialog'u */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="mt-3">
              Seçili {selected.size} kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <span className="block">
                Seçilen kullanıcıların hesapları ve bu hesaplara ait <strong>tüm kayıtlar</strong>{" "}
                (projeler, etkinlikler, pano paylaşımları, toplantılar, tutanaklar, raporlar,
                paydaşlar, dijital içerikler vb.) silinecek.
              </span>
              <span className="block font-medium text-destructive">Bu işlem geri alınamaz.</span>
              <span className="block text-xs">
                Eğer seçim son admin&apos;i de içeriyorsa o hesap otomatik korunur.
              </span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2 sm:gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={pending}>
                Vazgeç
              </Button>
            </DialogClose>
            <form action={handleBulkSubmit}>
              {Array.from(selected).map((id) => (
                <input key={id} type="hidden" name="userId" value={id} />
              ))}
              <Button
                type="submit"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={pending || selected.size === 0}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Siliniyor…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Evet, {selected.size} hesabı sil
                  </>
                )}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
