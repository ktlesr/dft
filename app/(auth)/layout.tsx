import Link from "next/link";

import { BrandVertical } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="brand-gradient-soft absolute inset-0 -z-10" aria-hidden />

      {/* Theme toggle floats in the top-right; no full header bar needed. */}
      <div className="absolute right-4 top-4 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 px-4 py-10">
        <Link href="/" aria-label="DFT Portal ana sayfa">
          <BrandVertical className="h-40 sm:h-48" />
        </Link>
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
