import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { countsByType, listMyRecords } from "@/features/records/queries";
import { RECORD_LABELS, RECORD_ORDER, isRecordType, type RecordTypeSlug } from "@/features/records/types";
import { formatDate } from "@/lib/utils";
import {
  PROJECT_APPLICATION_STATUS_LABELS,
  PROJECT_IDEA_STAGE_LABELS,
} from "@/lib/constants";

export const metadata = { title: "Kayıtlarım" };

type SearchParams = Promise<{ tur?: string; q?: string }>;

export default async function MyRecordsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { tur, q } = await searchParams;
  const activeType: RecordTypeSlug | null = tur && isRecordType(tur) ? tur : null;

  const [counts, rows] = await Promise.all([
    countsByType(user.id),
    listMyRecords(user.id, { type: activeType ?? undefined, query: q }),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Kayıtlarım"
        description="Oluşturduğunuz tüm kayıtlar — tür ve arama ile filtreleyin."
        breadcrumbs={[{ label: "Kayıtlarım" }]}
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
        <TypePill href={mkHref(null, q)} active={activeType === null} label="Tümü" count={total} />
        {RECORD_ORDER.map((t) => (
          <TypePill key={t} href={mkHref(t, q)} active={activeType === t} label={RECORD_LABELS[t]} count={counts[t]} />
        ))}
      </div>

      <form className="mb-4 flex gap-2" action="/kayitlarim">
        {activeType ? <input type="hidden" name="tur" value={activeType} /> : null}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Başlık içinde ara…" className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href={mkHref(activeType, "")}>Temizle</Link>
          </Button>
        ) : null}
      </form>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              title={q ? "Arama sonuç bulamadı" : "Henüz kayıt yok"}
              description={q ? "Farklı bir anahtar kelime deneyin." : "Sağ üstteki Yeni Kayıt düğmesi ile başlayın."}
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Başlık</th>
                    <th className="px-4 py-3 font-medium">Tür</th>
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
                      <td className="px-4 py-3">
                        <Badge variant="outline">{RECORD_LABELS[r.type]}</Badge>
                      </td>
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

function mkHref(t: RecordTypeSlug | null, q: string | undefined) {
  const p = new URLSearchParams();
  if (t) p.set("tur", t);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/kayitlarim?${qs}` : "/kayitlarim";
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
  return raw;
}
