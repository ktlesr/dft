import Link from "next/link";
import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = {
  title: "Üyelik başvurusu",
};

export default function SignupPage() {
  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl">Üyelik başvurusu</CardTitle>
        <CardDescription>
          Başvurunuz admin onayına sunulur. Onay sonrası portala erişebilirsiniz.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <SignupForm />
      </CardContent>

      <CardFooter className="flex flex-col gap-2 border-t pt-5 text-center text-sm">
        <p className="text-muted-foreground">
          Zaten hesabın var mı?{" "}
          <Link href="/giris" className="font-medium text-primary hover:underline">
            Giriş yap
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
