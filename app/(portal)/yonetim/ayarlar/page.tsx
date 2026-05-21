import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/current-user";
import { getNotificationPrefs } from "@/lib/notifications/notification-prefs";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { NotificationPrefsForm } from "@/features/settings/notification-prefs-form";

export const metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const prefs = await getNotificationPrefs();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Ayarlar"
        description="Bildirim tercihleri ve sistem ayarları."
        breadcrumbs={[{ label: "Yönetim", href: "/yonetim" }, { label: "Ayarlar" }]}
      />
      <AdminPanelNav />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Bildirimler</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPrefsForm
            defaultLogin={prefs.loginNotificationsEnabled}
            defaultLogout={prefs.logoutNotificationsEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
