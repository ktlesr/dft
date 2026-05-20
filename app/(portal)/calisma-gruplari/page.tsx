import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { isAdmin } from "@/lib/rbac";
import MyGroupPage from "@/app/(portal)/calisma-grubum/page";

export const metadata = { title: "Çalışma Grupları" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tab?: string; grup?: string }>;

export default async function AdminGroupWorkspacesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireActiveUser();
  if (!isAdmin(user)) await redirectUnauthorized();

  const nextSearchParams = (async () => {
    const params = await searchParams;
    return { ...params, tumGruplar: "1" };
  })();

  return <MyGroupPage searchParams={nextSearchParams} />;
}
