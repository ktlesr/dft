"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Trash2, XCircle, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { avatarUrl, formatDate, initials } from "@/lib/utils";
import { cn } from "@/lib/utils";
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
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked: boolean | "indeterminate") => {
    if (checked === true) setSelected(new Set(selectableIds));
    else setSelected(new Set());
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

  // Submit sonrası ek action — selected'i temizlemek için kullanırız.
  const handleBulkSubmit = (fd: FormData) => {
    startTransition(() => bulkDeleteUsersByAdmin(fd));
    setBulkDialogOpen(false);
    // selected, page reload sonrası anlamsız zaten — yine de UI hızlı temizlensin
    setSelected(new Set());
  };

  return (
    <div>
      {/* Toplu aksiyon barı — herhangi bir şey seçildiğinde görünür */}
      {selected.size > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="success" className="font-medium">
              {selected.size}
            </Badge>
            <span>kullanıcı seçildi</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="h-8">
              <X className="h-3.5 w-3.5" />
              Seçimi temizle
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
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  aria-label="Tümünü seç"
                  disabled={selectableIds.length === 0}
                />
              </th>
              <th className="px-4 py-3 font-medium">Kullanıcı</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Grup</th>
              <th className="px-4 py-3 font-medium">Roller</th>
              <th className="px-4 py-3 font-medium">Kaydoldu</th>
              <th className="px-4 py-3 text-right font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => {
              const isSelf = u.id === adminId;
              const isSelected = selected.has(u.id);
              return (
                <tr
                  key={u.id}
                  className={cn(
                    "transition-colors hover:bg-muted/20",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <td className="px-3 py-3">
                    {!isSelf ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(c) => toggleOne(u.id, c)}
                        aria-label={`${u.name ?? u.email} seç`}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {u.image ? (
                          <AvatarImage src={avatarUrl(u.id, u.image)} alt={u.name ?? u.email} />
                        ) : null}
                        <AvatarFallback>{initials(u.name, u.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <Link
                          href={`/yonetim/kullanicilar/${u.id}`}
                          className="truncate font-medium hover:text-primary"
                        >
                          {u.name ?? u.email}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3">
                    {u.group?.code ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Badge variant="outline">{u.group.code}</Badge>
                        {u.group.description ? (
                          <span className="hidden text-[11px] text-muted-foreground sm:inline">
                            {u.group.description}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles
                        .filter((r) => r.role !== "USER")
                        .map((r) => (
                          <Badge key={r.role} variant="secondary" className="text-[10px]">
                            {ROLE_LABELS[r.role]}
                          </Badge>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {u.status === "PENDING_APPROVAL" ? (
                        <>
                          <form action={approveUser}>
                            <input type="hidden" name="userId" value={u.id} />
                            <Button type="submit" size="sm" variant="accent" className="h-8 px-2">
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
                        <DeleteUserButton userId={u.id} userName={u.name ?? u.email} compact />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
                Eğer seçim son admin'i de içeriyorsa o hesap otomatik korunur.
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

function StatusBadge({ status }: { status: UserStatus }) {
  const variant =
    status === "ACTIVE"
      ? "success"
      : status === "PENDING_APPROVAL"
        ? "warning"
        : "muted";
  return (
    <Badge variant={variant as "success" | "warning" | "muted"}>
      {USER_STATUS_LABELS[status]}
    </Badge>
  );
}
