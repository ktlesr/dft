import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Aradığınız sayfa mevcut değil veya erişim izniniz olmayabilir.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button asChild variant="brand">
            <Link href="/panel">Ana panele dön</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Giriş sayfası</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
