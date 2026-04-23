import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { listBoardPosts } from "@/features/board/queries";
import { NewBoardPostDialog } from "@/features/board/new-post-dialog";
import { PostCard } from "@/features/board/post-card";
import { isAdmin } from "@/lib/rbac";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import type { BoardPostKind } from "@prisma/client";

export const metadata = { title: "Genel Pano" };

type SearchParams = Promise<{ q?: string; tur?: string }>;

function isKind(v?: string): v is BoardPostKind {
  return !!v && v in BOARD_KIND_LABELS;
}

export default async function GeneralBoardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { q, tur } = await searchParams;
  const kind = isKind(tur) ? tur : undefined;

  const posts = await listBoardPosts({
    scope: "GENERAL",
    query: q,
    kind,
  });

  const admin = isAdmin(user);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Genel Pano"
        description="Tüm DFT üyelerine açık paylaşımlar: haberler, duyurular, öneriler, fikirler, kaynaklar."
        breadcrumbs={[{ label: "Panolar", href: "/panolar" }, { label: "Genel" }]}
        actions={<NewBoardPostDialog scope="GENERAL" canPin={admin} />}
      />

      <form action="/panolar/genel" className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Paylaşımlarda ara…" className="pl-9" />
        </div>
        <KindFilter active={kind} />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q || kind ? (
          <Button asChild variant="ghost">
            <Link href="/panolar/genel">Temizle</Link>
          </Button>
        ) : null}
      </form>

      {posts.length === 0 ? (
        <EmptyState
          title={q || kind ? "Sonuç bulunamadı" : "Henüz paylaşım yok"}
          description={
            q || kind
              ? "Farklı bir arama veya filtre deneyin."
              : "İlk paylaşımı oluşturmak için sağ üstteki düğmeyi kullanın."
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
                canPin: admin,
                canRemove: admin || p.authorId === user.id,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KindFilter({ active }: { active?: BoardPostKind }) {
  return (
    <select
      name="tur"
      defaultValue={active ?? ""}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label="Tür filtresi"
    >
      <option value="">Tüm türler</option>
      {Object.entries(BOARD_KIND_LABELS).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}
