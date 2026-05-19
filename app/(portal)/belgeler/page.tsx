import Link from "next/link";
import { FileText, Paperclip, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { groupBadgeClass } from "@/lib/group-badge";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/constants";
import { isAdmin, isModerator } from "@/lib/rbac";
import { formatDateTime } from "@/lib/utils";
import { UploadDocumentDialog } from "@/features/documents/upload-dialog";
import type { DocumentCategory } from "@prisma/client";

export const metadata = { title: "Belgeler" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ kategori?: string; q?: string }>;

function isCategory(v?: string): v is DocumentCategory {
  return !!v && v in DOCUMENT_CATEGORY_LABELS;
}

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { kategori, q } = await searchParams;
  const category = isCategory(kategori) ? kategori : undefined;

  // Access: members see ORTAK + own-group GRUP + own UYE_YUKLEMESI + own group
  // TUTANAK_EK / RAPOR_EK (since those are tied to group scoped resources).
  const access = isAdmin(user)
    ? {}
    : {
        OR: [
          { category: "ORTAK" as const },
          ...(user.groupId
            ? [
                { category: "GRUP" as const, groupId: user.groupId },
                { category: "TUTANAK_EK" as const, groupId: user.groupId },
                { category: "RAPOR_EK" as const, groupId: user.groupId },
              ]
            : []),
          { category: "UYE_YUKLEMESI" as const, uploadedById: user.id },
        ],
      };

  const documents = await prisma.document.findMany({
    where: {
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...access,
    },
    orderBy: { createdAt: "desc" },
    include: {
      attachments: { select: { id: true, originalName: true, size: true, mimeType: true } },
      uploadedBy: { select: { name: true, email: true } },
      group: { select: { code: true } },
    },
    take: 80,
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Belgeler"
        description="Ortak belgeler, grup belgeleri, tutanak ve rapor ekleri tek ekranda."
        breadcrumbs={[{ label: "Belgeler" }]}
        actions={
          <UploadDocumentDialog
            isAdmin={isAdmin(user)}
            isModerator={isModerator(user)}
            hasGroup={!!user.groupId}
          />
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <CatPill href={mkHref(undefined, q)} active={!category} label="Tümü" />
        {(["ORTAK", "GRUP", "TUTANAK_EK", "RAPOR_EK", "UYE_YUKLEMESI"] as DocumentCategory[]).map((c) => (
          <CatPill
            key={c}
            href={mkHref(c, q)}
            active={category === c}
            label={DOCUMENT_CATEGORY_LABELS[c]}
          />
        ))}
      </div>

      <form action="/belgeler" className="mb-4 flex gap-2">
        {category ? <input type="hidden" name="kategori" value={category} /> : null}
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Belge başlığı / açıklama…" className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href={mkHref(category, "")}>Temizle</Link>
          </Button>
        ) : null}
      </form>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={q || category ? "Sonuç bulunamadı" : "Henüz belge yok"}
          description={
            q || category
              ? "Farklı bir arama veya kategori deneyin."
              : "İlk belgeyi sağ üstten yükleyin."
          }
        />
      ) : (
        <div className="grid gap-3">
          {documents.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{d.title}</p>
                      <Badge variant="outline">{DOCUMENT_CATEGORY_LABELS[d.category]}</Badge>
                      {d.group?.code ? (
                        <Badge variant="outline" className={groupBadgeClass(d.group.code)}>
                          {d.group.code}
                        </Badge>
                      ) : null}
                    </div>
                    {d.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{d.description}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {d.uploadedBy?.name ?? d.uploadedBy?.email} · {formatDateTime(d.createdAt)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    {d.attachments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Ek dosya yok</p>
                    ) : (
                      <ul className="space-y-1">
                        {d.attachments.map((a) => (
                          <li key={a.id}>
                            <Link
                              href={`/api/dosya/${a.id}`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Paperclip className="h-3.5 w-3.5" />
                              {a.originalName}
                              <span className="text-muted-foreground">
                                · {Math.round(a.size / 1024)} KB
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function mkHref(cat: DocumentCategory | undefined, q: string | undefined) {
  const p = new URLSearchParams();
  if (cat) p.set("kategori", cat);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/belgeler?${qs}` : "/belgeler";
}

function CatPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      {label}
    </Link>
  );
}
