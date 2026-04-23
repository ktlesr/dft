import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Giriş yap",
};

type SearchParams = Promise<{ e?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const banner = params.e === "dogrulandi" || params.e === "dogrulama-hata" ? params.e : null;

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Portala giriş yap</CardTitle>
        <CardDescription>DFT Kapalı Portalı yalnızca yetkili üyelere açıktır.</CardDescription>
      </CardHeader>

      <CardContent>
        <LoginForm banner={banner} />
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t pt-5 text-center text-sm">
        <p className="text-muted-foreground">
          Hesabın yok mu?{" "}
          <Link href="/kayit" className="font-medium text-primary hover:underline">
            Üyelik başvurusu yap
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
