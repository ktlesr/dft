import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import {
  countsByType,
  countsByTypeForAll,
  listAllRecords,
  listMyRecords,
} from "@/features/records/queries";
import {
  ACTIVE_RECORD_TYPES,
  RECORD_LABELS,
  type ActiveRecordTypeSlug,
  type RecordTypeSlug,
} from "@/features/records/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PROJECT_APPLICATION_STATUS_LABELS,
  PROJECT_IDEA_STAGE_LABELS,
  STAKEHOLDER_KIND_LABELS,
} from "@/lib/constants";

export const metadata = { title: "Paylaşımlar" };

type SearchParams = Promise<{ tur?: string; q?: string; scope?: string }>;
type ScopeMode = "mine" | "all";

const DEFAULT_TYPE: ActiveRecordTypeSlug = "proje-fikri";

function isActiveType(x: string): x is ActiveRecordTypeSlug {
  return (ACTIVE_RECORD_TYPES as readonly string[]).includes(x);
}

export default async function PaylasimlarPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { tur, q, scope } = await searchParams;
  const scopeMode: ScopeMode = scope === "all" ? "all" : "mine";
  const activeType: ActiveRecordTypeSlug = tur && isActiveType(tur) ? tur : DEFAULT_TYPE;

  const [counts, rows] = await Promise.all([
    scopeMode === "all" ? countsByTypeForAll() : countsByType(user.id),
    scopeMode === "all"
      ? listAllRecords({ type: activeType, query: q })
      : listMyRecords(user.id, { type: activeType, query: q }),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Paylaşımlar"
        description="DFT üyeleri tarafından girilen kayıtların yer aldığı alandır."
        breadcrumbs={[{ label: "Paylaşımlar" }]}
        actions={
          <Button asChild variant="brand">
            <Link href="/kayit/yeni">
              <PlusCircle className="h-4 w-4" />
              Yeni Kayıt
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <ScopeButton
          href={mkHref({ scope: "mine", tur: activeType, q })}
          active={scopeMode === "mine"}
          label="Kendi Kayıtlarım"
        />
        <ScopeButton
          href={mkHref({ scope: "all", tur: activeType, q })}
          active={scopeMode === "all"}
          label="Tüm Kayıtlar"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {ACTIVE_RECORD_TYPES.map((t) => (
          <TypePill
            key={t}
            href={mkHref({ scope: scopeMode, tur: t, q })}
            active={activeType === t}
            label={RECORD_LABELS[t]}
            count={counts[t]}
          />
        ))}
      </div>

      <form className="mb-4 flex gap-2" action="/kayitlarim">
        <input type="hidden" name="scope" value={scopeMode} />
        <input type="hidden" name="tur" value={activeType} />
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Başlık içinde ara…" className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href={mkHref({ scope: scopeMode, tur: activeType, q: "" })}>Temizle</Link>
          </Button>
        ) : null}
      </form>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              title={q ? "Arama sonuç bulamadı" : "Henüz kayıt yok"}
              description={
                q
                  ? "Farklı bir anahtar kelime deneyin."
                  : scopeMode === "mine"
                    ? "Sağ üstteki Yeni Kayıt düğmesi ile başlayın."
                    : "Henüz hiçbir üye bu türde kayıt eklemedi."
              }
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Başlık</th>
                    {scopeMode === "all" ? (
                      <th className="px-4 py-3 font-medium">Paylaşan</th>
                    ) : null}
                    <th className="px-4 py-3 font-medium">Durum</th>
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium text-right">Güncellendi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => (
                    <tr key={`${r.type}:${r.id}`} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link
                          href={`/kayitlarim/${r.type}/${r.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {r.title}
                        </Link>
                        {r.subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                        ) : null}
                      </td>
                      {scopeMode === "all" ? (
                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-foreground">{r.owner?.name ?? "—"}</span>
                            {r.owner?.groupCode ? (
                              <Badge variant="outline" className="text-[10px]">
                                {r.owner.groupCode}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-xs">
                        {r.status ? humanStatus(r.type, r.status) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(r.date)}</td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {formatDate(r.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function mkHref({
  scope,
  tur,
  q,
}: {
  scope: ScopeMode;
  tur: ActiveRecordTypeSlug;
  q: string | undefined;
}) {
  const p = new URLSearchParams();
  if (scope !== "mine") p.set("scope", scope);
  if (tur !== DEFAULT_TYPE) p.set("tur", tur);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/kayitlarim?${qs}` : "/kayitlarim";
}

function ScopeButton({
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
      className={cn(
        "inline-flex min-w-44 items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

function TypePill({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")
      }
    >
      <span>{label}</span>
      <span
        className={
          "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] " +
          (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
        }
      >
        {count}
      </span>
    </Link>
  );
}

function humanStatus(type: RecordTypeSlug, raw: string): string {
  if (type === "proje-basvurusu") {
    const key = raw as keyof typeof PROJECT_APPLICATION_STATUS_LABELS;
    return PROJECT_APPLICATION_STATUS_LABELS[key] ?? raw;
  }
  if (type === "proje-fikri") {
    const key = raw as keyof typeof PROJECT_IDEA_STAGE_LABELS;
    return PROJECT_IDEA_STAGE_LABELS[key] ?? raw;
  }
  if (type === "paydas") {
    const key = raw as keyof typeof STAKEHOLDER_KIND_LABELS;
    return STAKEHOLDER_KIND_LABELS[key] ?? raw;
  }
  return raw;
}
