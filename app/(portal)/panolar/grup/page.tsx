import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { FilterSelect } from "@/components/app/filter-select";
import { requireActiveUser } from "@/lib/current-user";
import { groupBadgeClass } from "@/lib/group-badge";
import { listBoardPosts } from "@/features/board/queries";
import { NewBoardPostDialog } from "@/features/board/new-post-dialog";
import { PostCard } from "@/features/board/post-card";
import { isAdmin, isModerator } from "@/lib/rbac";
import { BOARD_KIND_LABELS, BOARD_KIND_BY_SCOPE } from "@/lib/constants";
import type { BoardPostKind } from "@prisma/client";

export const metadata = { title: "Grup Panosu" };

type SearchParams = Promise<{ q?: string; tur?: string }>;

function isKind(v?: string): v is BoardPostKind {
  return !!v && v in BOARD_KIND_LABELS;
}

export default async function GroupBoardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { q, tur } = await searchParams;
  const kind = isKind(tur) ? tur : undefined;

  if (!user.groupId || !user.groupCode) {
    return (
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Grup Panosu"
          breadcrumbs={[{ label: "Panolar", href: "/panolar" }, { label: "Grup" }]}
        />
        <EmptyState
          title="Henüz bir çalışma grubuna atanmadınız"
          description="Yöneticiniz grubu atadıktan sonra bu alan aktif olur."
        />
      </div>
    );
  }

  const posts = await listBoardPosts({
    scope: "GROUP",
    groupId: user.groupId,
    kind,
    query: q,
  });

  const groupMod = isModerator(user);
  const admin = isAdmin(user);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Grup Panosu"
        description={`Yalnızca ${user.groupCode} grubundaki üyeler görür.`}
        breadcrumbs={[{ label: "Panolar", href: "/panolar" }, { label: "Grup" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={groupBadgeClass(user.groupCode)}>
              {user.groupCode}
            </Badge>
            <NewBoardPostDialog scope="GROUP" canPin={admin || groupMod} />
          </div>
        }
      />

      {user.groupDescription ? (
        <p className="mb-4 text-xs text-muted-foreground">{user.groupDescription}</p>
      ) : null}

      <form action="/panolar/grup" className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Grup paylaşımlarında ara…" className="pl-9" />
        </div>
        <FilterSelect
          param="tur"
          value={kind}
          options={BOARD_KIND_BY_SCOPE.GROUP.map((v) => ({ value: v, label: BOARD_KIND_LABELS[v] }))}
          placeholder="Tüm türler"
          allLabel="Tüm türler"
          ariaLabel="Tür filtresi"
        />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q || kind ? (
          <Button asChild variant="ghost">
            <Link href="/panolar/grup">Temizle</Link>
          </Button>
        ) : null}
      </form>

      {posts.length === 0 ? (
        <EmptyState
          title={q || kind ? "Sonuç bulunamadı" : "Grup panosunda henüz paylaşım yok"}
          description={
            q || kind
              ? "Farklı bir arama veya filtre deneyin."
              : "İlk grup paylaşımı grup merkezinin hafızası olur."
          }
        />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={{
                id: p.id,
                scope: p.scope,
                kind: p.kind,
                title: p.title,
                body: p.body,
                tags: p.tags,
                externalUrl: p.externalUrl,
                pinned: p.pinned,
                publishedAt: p.publishedAt,
                author: p.author,
                attachments: p.attachments,
              }}
              caps={{
                canPin: admin || groupMod,
                canRemove: admin || groupMod || p.authorId === user.id,
                canEdit: admin,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
