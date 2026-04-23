import Link from "next/link";

import { BrandLockup } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="brand-gradient-soft absolute inset-0 -z-10" aria-hidden />
      <header className="flex h-16 items-center justify-between px-6">
        <Link href="/" aria-label="Ana sayfa">
          <BrandLockup />
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
