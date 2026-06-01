import Link from "next/link";

import { BrandVertical } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-atmosphere grain relative min-h-screen overflow-hidden">
      {/* Theme toggle floats in the top-right; no full header bar needed. */}
      <div className="absolute right-4 top-4 z-10 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <main className="mx-auto grid min-h-screen w-full max-w-5xl grid-cols-1 items-center gap-10 px-4 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8">
        {/* Brand side — dominates above the form on desktop, on top on mobile */}
        <section className="flex flex-col items-center text-center lg:items-start lg:gap-9 lg:text-left">
          <Link href="/" aria-label="DFT Portal ana sayfa">
            <BrandVertical className="h-28 drop-shadow-sm sm:h-36 lg:h-48" />
          </Link>

          <div className="mt-6 hidden max-w-sm space-y-4 lg:mt-0 lg:block">
            <h1 className="font-display text-[1.9rem] font-semibold leading-[1.15] tracking-tight text-foreground">
              Yetkili üyelere özel kurumsal çalışma alanı
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kayıtlarınızı, çalışma grubunuzu ve duyuruları tek güvenli merkezden
              yönetin. Bu portal kamuya açık değildir.
            </p>
            <div className="brand-hairline h-px w-44" />
          </div>
        </section>

        {/* Form side — renders the auth page's card */}
        <section className="w-full">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </section>
      </main>
    </div>
  );
}
