import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/current-user";
import { AdminPanelNav } from "@/components/app/admin-nav";
import { GroupForm } from "@/features/admin/group-form";

export const metadata = { title: "Yeni grup · Yönetim" };
export const dynamic = "force-dynamic";

export default async function NewGroupPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Yeni çalışma grubu"
        description="Grup kodunu, adını ve açıklamasını belirleyin. Grup oluşturulduktan sonra üyelere atayabilirsiniz."
        breadcrumbs={[
          { label: "Yönetim", href: "/yonetim" },
          { label: "Gruplar", href: "/yonetim/gruplar" },
          { label: "Yeni" },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link href="/yonetim/gruplar">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
          </Button>
        }
      />
      <AdminPanelNav />
      <Card>
        <CardContent className="p-6">
          <GroupForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
