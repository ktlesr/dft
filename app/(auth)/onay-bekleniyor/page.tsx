import Link from "next/link";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Onay bekleniyor" };

export default function PendingApprovalPage() {
  return (
    <Card className="border-border/60 text-center shadow-lg">
      <CardHeader className="items-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl">Onay bekleniyor</CardTitle>
        <CardDescription>
          Başvurunuz yöneticilere iletildi. Hesabınız aktifleştirildiğinde e-posta ile bilgilendirileceksiniz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link href="/giris">Giriş ekranına dön</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
