"use client";

import * as React from "react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function GoogleSignInButton({
  disabled,
  label = "Google ile giriş yap",
  redirectTo = "/panel",
}: {
  disabled?: boolean;
  label?: string;
  redirectTo?: string;
}) {
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || pending}
      onClick={() => {
        setPending(true);
        signIn("google", { redirectTo }).catch(() => setPending(false));
      }}
    >
      <GoogleIcon className="h-4 w-4" />
      {pending ? "Yönlendiriliyor…" : label}
    </Button>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.99 7.28-2.66l-3.56-2.76c-.99.66-2.26 1.06-3.72 1.06-2.86 0-5.28-1.93-6.14-4.52H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.86 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.36-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.96l3.68-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.02 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.68 2.84C6.72 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
