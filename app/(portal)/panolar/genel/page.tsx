import Link from "next/link";
import { Search, Upload } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { FilterSelect } from "@/components/app/filter-select";
import { requireActiveUser } from "@/lib/current-user";
import { listBoardPosts } from "@/features/board/queries";
import { NewBoardPostDialog } from "@/features/board/new-post-dialog";
import { PostCard } from "@/features/board/post-card";
import { isAdmin } from "@/lib/rbac";
import { BOARD_KIND_LABELS, BOARD_KIND_BY_SCOPE } from "@/lib/constants";
import type { BoardPostKind } from "@prisma/client";

export const metadata = { title: "Genel Pano" };

type SearchParams = Promise<{ q?: string; tur?: string; kategori?: string }>;

const CATEGORIES = {
  "cagri-hibe-etkinlik": {
    title: "Çağrı / Hibe / Etkinlik Duyuruları",
    description:
      "Tüm DFT üyelerine açık paylaşımlar: haber/etkinlik, çağrı/hibe duyuruları, doküman paylaşımları.",
    kinds: ["ANNOUNCEMENT", "RESOURCE"] as BoardPostKind[],
    authorIsAdmin: true,
    /** Yalnızca admin yeni paylaşım açabilir. */
    creatorAdminOnly: true,
  },
  "genel-duyuru": {
    title: "Genel Duyurular",
    description: "DFT yönetimi tarafından yapılan genel duyurular.",
    kinds: ["NEWS"] as BoardPostKind[],
    authorIsAdmin: true,
    creatorAdminOnly: true,
  },
} as const;
type CategoryKey = keyof typeof CATEGORIES;

function isCategoryKey(v?: string): v is CategoryKey {
  return !!v && v in CATEGORIES;
}

function isKind(v?: string): v is BoardPostKind {
  return !!v && v in BOARD_KIND_LABELS;
}

export default async function GeneralBoardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { q, tur, kategori } = await searchParams;
  const kategoriKey = isCategoryKey(kategori) ? kategori : null;
  const view = kategoriKey ? CATEGORIES[kategoriKey] : null;
  const kind = isKind(tur) ? tur : undefined;

  const admin = isAdmin(user);

  const posts = await listBoardPosts({
    scope: "GENERAL",
    query: q,
    // Kategori varsa kategori `kinds` listesi öncelikli; ek olarak kullanıcı
    // alt-türü daraltabilir.
    kinds: view ? view.kinds : undefined,
    kind: view ? undefined : kind,
    authorIsAdmin: view?.authorIsAdmin ?? false,
  });

  // Kategoriye özel kind dropdown listesi (sadece kategori kinds'lerinden).
  const kindOptions = view
    ? view.kinds.map((v) => ({ value: v, label: BOARD_KIND_LABELS[v] }))
    : BOARD_KIND_BY_SCOPE.GENERAL.map((v) => ({ value: v, label: BOARD_KIND_LABELS[v] }));

  // Yeni paylaşım yetkisi: kategori "yalnızca admin" ise sadece admin'e
  // göster; aksi takdirde herkese (mevcut davranış).
  const canCreate = view?.creatorAdminOnly ? admin : true;

  const pageTitle = view?.title ?? "Genel Pano";
  const pageDescription =
    view?.description ??
    "Tüm DFT üyelerine açık paylaşımlar: haber/etkinlik, çağrı/hibe duyuruları, doküman paylaşımları.";

  const clearHref = kategoriKey ? `/panolar/genel?kategori=${kategoriKey}` : "/panolar/genel";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={[{ label: "Panolar", href: "/panolar" }, { label: "Genel" }]}
        actions={
          <>
            {admin ? (
              <Button asChild variant="secondary">
                <Link href="/panolar/genel/toplu">
                  <Upload className="h-4 w-4" />
                  Toplu yükle
                </Link>
              </Button>
            ) : null}
            {canCreate ? <NewBoardPostDialog scope="GENERAL" canPin={admin} /> : null}
          </>
        }
      />

      <form action="/panolar/genel" className="mb-4 flex flex-wrap items-center gap-2">
        {kategoriKey ? <input type="hidden" name="kategori" value={kategoriKey} /> : null}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Paylaşımlarda ara…" className="pl-9" />
        </div>
        <FilterSelect
          param="tur"
          value={kind}
          options={kindOptions}
          placeholder="Tüm türler"
          allLabel="Tüm türler"
          ariaLabel="Tür filtresi"
        />
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q || kind ? (
          <Button asChild variant="ghost">
            <Link href={clearHref}>Temizle</Link>
          </Button>
        ) : null}
      </form>

      {posts.length === 0 ? (
        <EmptyState
          title={q || kind ? "Sonuç bulunamadı" : "Henüz paylaşım yok"}
          description={
            q || kind
              ? "Farklı bir arama veya filtre deneyin."
              : view?.creatorAdminOnly
                ? "Yönetici yeni paylaşım eklediğinde burada görünecek."
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
                assessment: p.assessment,
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
