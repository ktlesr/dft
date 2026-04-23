import Link from "next/link";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotForm } from "@/features/auth/forgot-form";

export const metadata = { title: "Şifremi unuttum" };

export default function ForgotPasswordPage() {
  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Şifre sıfırlama</CardTitle>
        <CardDescription>
          Hesabınıza bağlı e-posta adresini girin. Geçerli bir hesap varsa sıfırlama bağlantısı gönderilir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotForm />
      </CardContent>
      <CardFooter className="border-t pt-5 text-sm">
        <Link href="/giris" className="text-muted-foreground hover:text-foreground">
          ← Giriş ekranına dön
        </Link>
      </CardFooter>
    </Card>
  );
}
