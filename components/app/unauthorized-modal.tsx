"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function UnauthorizedModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams?.get("yetkisiz") === "1";

  const closeHref = useMemo(() => {
    const p = new URLSearchParams(searchParams?.toString() ?? "");
    p.delete("yetkisiz");
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) router.replace(closeHref);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <DialogTitle>Yetkisiz erişim</DialogTitle>
          <DialogDescription>
            Bu sayfayi goruntuleme yetkiniz yok. Erisim gerekiyorsa yoneticinizle iletisime gecin.
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="outline"
          onClick={() => {
            router.replace(closeHref);
          }}
        >
          Tamam
        </Button>
      </DialogContent>
    </Dialog>
  );
}
