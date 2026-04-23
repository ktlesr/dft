import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetForm } from "@/features/auth/reset-form";

export const metadata = { title: "Şifre sıfırlama" };

type Params = Promise<{ token: string }>;

export default async function ResetPage({ params }: { params: Params }) {
  const { token } = await params;

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Yeni şifre belirle</CardTitle>
        <CardDescription>Güçlü bir şifre seçin. Bağlantı tek kullanımlıktır.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetForm token={token} />
      </CardContent>
    </Card>
  );
}
