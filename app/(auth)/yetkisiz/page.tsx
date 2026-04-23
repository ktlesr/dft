import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Yetkisiz" };

export default function UnauthorizedPage() {
  return (
    <Card className="border-border/60 text-center shadow-lg">
      <CardHeader className="items-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <CardTitle className="text-xl">Yetkisiz erişim</CardTitle>
        <CardDescription>
          Bu sayfayı görüntüleme yetkiniz yok. Erişim gerekiyorsa yöneticinizle iletişime geçin.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild variant="outline">
          <Link href="/panel">Ana panele dön</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
