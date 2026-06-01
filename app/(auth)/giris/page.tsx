import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Giriş yap",
};

type SearchParams = Promise<{ e?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const banner = params.e === "dogrulandi" || params.e === "dogrulama-hata" ? params.e : null;

  return (
    <Card className="border-border/60 shadow-elevated">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Portala giriş yap</CardTitle>
        <CardDescription>
          DFT Projesi Portalı yalnızca yetkili üyelere açıktır. Hesap erişimi yönetici tarafından
          verilir.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <LoginForm banner={banner} />
      </CardContent>
    </Card>
  );
}
