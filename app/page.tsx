import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Lock, Shield, Users } from "lucide-react";

import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/current-user";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user?.status === "ACTIVE") redirect("/panel");
  if (user?.status === "PENDING_APPROVAL") redirect("/onay-bekleniyor");
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="brand-gradient-soft absolute inset-0 -z-10" aria-hidden />
      <header className="flex h-16 items-center justify-between px-6 md:px-10">
        <BrandLockup />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" variant="brand">
            <Link href="/giris">
              Giriş yap
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-start gap-12 px-6 py-16 md:py-24">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Lock className="h-3 w-3 text-brand-green" />
            Kapalı üye portalı · sadece yetkili erişim
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
            <span className="text-brand-blue">DFT</span> üyeleri için kurumsal{" "}
            <span className="text-brand-green">çalışma alanı</span>.
          </h1>
          <p className="text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Proje başvurularınız, etkinlik kayıtlarınız, çalışma grubu toplantılarınız,
            tutanaklar, raporlar ve belgeleriniz tek bir güvenli portalda.
            Portal tamamen kapalı bir sistemdir — hesap erişimi yalnızca yönetici tarafından verilir.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg" variant="brand">
              <Link href="/giris">
                Portala giriş yap
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid w-full gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Users className="h-5 w-5" />}
            title="Çalışma grupları"
            description="UAK, E2SC, DFSF, PGD ve PA gruplarının toplantı, tutanak ve raporları tek yerde."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Güvenlik öncelikli"
            description="Argon2id şifre, rol ve grup bazlı yetki, audit log, rate limit ve güvenli dosya yönetimi."
          />
          <FeatureCard
            icon={<Lock className="h-5 w-5" />}
            title="Yalnızca yönetici erişimi"
            description="Üyelik açık başvuruya kapalıdır. Hesaplar yönetici tarafından oluşturulup kullanıcılara teslim edilir."
          />
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-xs text-muted-foreground md:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} DFT Projesi Portalı</span>
          <span>Yetkisiz erişim teşebbüsleri kayıt altına alınır.</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card/80 p-5 shadow-sm backdrop-blur">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
