"use client";

import { LogOut } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";

export function SignOutMenuItem() {
  return (
    <form action={signOutAction}>
      <DropdownMenuItem asChild>
        <button type="submit" className="w-full cursor-pointer text-left">
          <LogOut className="h-4 w-4" />
          <span>Çıkış yap</span>
        </button>
      </DropdownMenuItem>
    </form>
  );
}
