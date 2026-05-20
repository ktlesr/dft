import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireActiveUser } from "@/lib/current-user";
import { groupBadgeClass } from "@/lib/group-badge";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, initials } from "@/lib/utils";
import { ProfileForm } from "@/features/profile/profile-form";
import { PasswordChangeForm } from "@/features/profile/password-form";
import { ProfilePhotoUploader, CvUploader } from "@/features/profile/media-forms";

export const metadata = { title: "Profilim" };
export const dynamic = "force-dynamic";
const DFT_ADMIN_EMAIL = "admin@dft.ktlsr.com";

export default async function ProfilePage() {
  const user = await requireActiveUser();
  const isDftSuperAdmin = user.email.toLowerCase() === DFT_ADMIN_EMAIL;
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
    <div className="mx-auto max-w-7xl">
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
          <Field
            label="Kullanıcı adı"
            value={
              userRow?.username ? (
                <span className="font-mono">{userRow.username}</span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Henüz atanmadı — yöneticinize bildirin.
                </span>
              )
            }
          />
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
              isDftSuperAdmin ? (
                <span className="inline-flex items-center gap-2">
                  <Badge variant="success">Süper Admin</Badge>
                  <span className="text-xs text-muted-foreground">Sistem Yöneticisi</span>
                </span>
              ) : user.groupCode ? (
                <span className="inline-flex items-center gap-2">
                  <Badge variant="outline" className={groupBadgeClass(user.groupCode)}>
                    {user.groupCode}
                  </Badge>
                  {user.groupDescription ? (
                    <span className="text-xs text-muted-foreground">
                      {user.groupDescription}
                    </span>
                  ) : null}
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

        <TabsContent value="bilgiler" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fotoğraf ve CV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProfilePhotoUploader
                currentPhotoUrl={userRow?.image ? `/api/profil/foto/${user.id}?v=${encodeURIComponent(userRow.image)}` : null}
                largePhotoUrl={userRow?.image ? `/api/profil/foto/${user.id}?size=lg&v=${encodeURIComponent(userRow.image)}` : null}
                fallback={initials(userRow?.name ?? null, user.email)}
              />
              <Separator />
              <div>
                <h4 className="mb-2 text-sm font-medium">Özgeçmiş (CV)</h4>
                <CvUploader
                  targetUserId={user.id}
                  hasCv={!!userRow?.profile?.cvStorageKey}
                  cvOriginalName={userRow?.profile?.cvOriginalName ?? null}
                  viewerIsSelf
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <ProfileForm defaults={defaults} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guvenlik">
          <Card>
            <CardContent className="space-y-6 p-6">
              <section>
                <h3 className="text-sm font-semibold">Şifre değiştirme</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hesabınıza en az 10 karakterlik, büyük-küçük harf, rakam ve özel karakter içeren güçlü bir şifre belirleyin.
                </p>
                <div className="mt-4">
                  {hasPassword ? (
                    <PasswordChangeForm />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Bu hesap şifresiz oluşturulmuş. Yeni bir şifre ayarlamak için yönetici ile iletişime geçin.
                    </p>
                  )}
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="text-sm font-semibold">Oturum bilgileri</h3>
                <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Son giriş
                    </dt>
                    <dd className="mt-1 text-sm">
                      {userRow?.lastLoginAt ? formatDateTime(userRow.lastLoginAt) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Oturum süresi
                    </dt>
                    <dd className="mt-1 text-sm">8 saat (her istekte yenilenir)</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Hesap kilidi
                    </dt>
                    <dd className="mt-1 text-sm">
                      Art arda 8 başarısız giriş → 15 dakika kilit
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Çıkış
                    </dt>
                    <dd className="mt-1 text-sm">
                      Sağ üstteki menüden &quot;Çıkış yap&quot; — bu cihazdaki oturumu sonlandırır.
                    </dd>
                  </div>
                </dl>
              </section>

              <Separator />

              <section className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
                <h3 className="text-sm font-semibold">Güvenlik ipuçları</h3>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>• Şifrenizi kimseyle paylaşmayın; yöneticiler dahi şifrenizi göremez (argon2id ile hashlenmiştir).</li>
                  <li>• Şüpheli bir giriş gördüğünüzde <strong>hemen şifrenizi değiştirin</strong> ve yöneticinize bildirin.</li>
                  <li>• Paylaşımlı bir cihazda giriş yaptıysanız işiniz bitince &quot;Çıkış yap&quot;&apos;ı kullanın.</li>
                </ul>
              </section>
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
