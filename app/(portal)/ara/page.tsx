import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/app/empty-state";
import { Input } from "@/components/ui/input";
import { requireActiveUser } from "@/lib/current-user";
import { globalSearch } from "@/features/search/queries";

export const metadata = { title: "Arama" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const { groups, totalShown } =
    query.length >= 2
      ? await globalSearch(user, query)
      : { groups: [], totalShown: 0 };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Arama"
        description={
          query.length >= 2
            ? `"${query}" için portal içi sonuçlar — sadece erişim yetkiniz olan kayıtlar gösterilir.`
            : "Panolar, kayıtlar, toplantılar, tutanaklar, raporlar, belgeler ve (yöneticiler için) kullanıcılar arasında arama yapın."
        }
        breadcrumbs={[{ label: "Arama" }]}
      />

      <form action="/ara" className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Anahtar kelime…"
            className="pl-9"
            autoFocus
            minLength={2}
            maxLength={100}
            aria-label="Arama sorgusu"
          />
        </div>
        <Button type="submit" variant="brand">
          Ara
        </Button>
      </form>

      {query.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Bir şey arayın"
          description="En az 2 karakter yazın. Her bölümde en çok 5 sonuç gösterilir — daha fazlası için ilgili ekrana gidin."
        />
      ) : query.length < 2 ? (
        <EmptyState
          icon={Search}
          title="Daha fazla karakter girin"
          description="Arama yapmak için en az 2 karakter gereklidir."
        />
      ) : totalShown === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description={`"${query}" için portal içinde erişiminiz olan bir kayıt bulunamadı. Farklı bir anahtar kelime deneyin.`}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {totalShown} sonuç — {groups.length} kategoride.
          </p>
          {groups.map((g) => (
            <Card key={g.key}>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">{g.label}</CardTitle>
                <Badge variant="outline" className="font-normal">
                  {g.items.length}
                </Badge>
              </CardHeader>
              <CardContent className="divide-y border-t p-0">
                {g.items.map((item) => (
                  <Link
                    key={`${g.key}-${item.id}`}
                    href={item.href}
                    className="group flex items-center justify-between gap-3 px-6 py-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-primary">
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
