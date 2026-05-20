"use client";

import * as React from "react";
import { LogOut } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/auth/actions";

export function SignOutMenuItem() {
  const formRef = React.useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={signOutAction} />
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          formRef.current?.requestSubmit();
        }}
      >
        <LogOut className="h-4 w-4" />
        <span>Çıkış yap</span>
      </DropdownMenuItem>
    </>
  );
}
