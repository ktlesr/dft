import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { GROUP_LABELS, ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { ProfileForm } from "@/features/profile/profile-form";
import { PasswordChangeForm } from "@/features/profile/password-form";

export const metadata = { title: "Profilim" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireActiveUser();
  const userRow = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true },
  });

  const defaults = {
    name: userRow?.name ?? "",
    title: userRow?.profile?.title ?? "",
    position: userRow?.profile?.position ?? "",
    organization: userRow?.profile?.organization ?? "",
    phone: userRow?.profile?.phone ?? "",
    bio: userRow?.profile?.bio ?? "",
    expertise: (userRow?.profile?.expertise ?? []).join(", "),
  };

  const hasPassword = !!userRow?.passwordHash;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Profilim"
        description="Kişisel bilgileriniz, iletişim, uzmanlık ve güvenlik ayarlarınız."
        breadcrumbs={[{ label: "Profilim" }]}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Hesap bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="E-posta" value={user.email} />
          <Field
            label="Durum"
            value={
              <Badge variant={user.status === "ACTIVE" ? "success" : "warning"}>
                {USER_STATUS_LABELS[user.status]}
              </Badge>
            }
          />
          <Field
            label="Çalışma Grubu"
            value={
              user.groupCode ? (
                <span className="inline-flex items-center gap-2">
                  <Badge variant="outline">{user.groupCode}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {GROUP_LABELS[user.groupCode].description}
                  </span>
                </span>
              ) : (
                "—"
              )
            }
          />
          <Field
            label="Roller"
            value={
              <div className="flex flex-wrap gap-1.5">
                {user.roles.map((r) => (
                  <Badge key={r} variant="secondary">
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
              </div>
            }
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="bilgiler">
        <TabsList>
          <TabsTrigger value="bilgiler">Kişisel bilgiler</TabsTrigger>
          <TabsTrigger value="guvenlik">Güvenlik</TabsTrigger>
        </TabsList>

        <TabsContent value="bilgiler">
          <Card>
            <CardContent className="p-6">
              <ProfileForm defaults={defaults} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guvenlik">
          <Card>
            <CardContent className="p-6">
              {hasPassword ? (
                <PasswordChangeForm />
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Bu hesap şifresiz. Portal'a Google ile giriş yapıyorsunuz; şifre değiştirme
                    seçeneği yalnızca şifreyle oluşturulmuş hesaplar için geçerlidir.
                  </p>
                </div>
              )}
              <Separator className="my-6" />
              <p className="text-xs text-muted-foreground">
                Oturum ayarları ve cihaz yönetimi Faz 5'te eklenecek.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
