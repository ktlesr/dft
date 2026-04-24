import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Paperclip, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";
import { isAdmin } from "@/lib/rbac";
import { softDeleteRecord } from "@/features/records/actions";
import { RECORD_LABELS, isRecordType, type RecordTypeSlug } from "@/features/records/types";
import {
  PROJECT_APPLICATION_KIND_LABELS,
  PROJECT_IDEA_STAGE_LABELS,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

type Params = Promise<{ type: string; id: string }>;

type FieldRow = { label: string; value: React.ReactNode };

async function loadRecord(type: RecordTypeSlug, id: string) {
  const include = { attachments: true };
  switch (type) {
    case "proje-basvurusu":
      return prisma.projectApplicationRecord.findUnique({ where: { id }, include });
    case "basarili-proje":
      return prisma.successfulProjectRecord.findUnique({ where: { id }, include });
    case "proje-fikri":
      return prisma.projectIdeaRecord.findUnique({ where: { id }, include });
    case "etkinlik":
      return prisma.eventRecord.findUnique({ where: { id }, include });
    case "bilgi-cogaltimi":
      return prisma.disseminationRecord.findUnique({ where: { id }, include });
    case "egitim-sunum":
      return prisma.trainingPresentationRecord.findUnique({ where: { id }, include });
    case "dokuman-icerik":
      return prisma.contentRecord.findUnique({ where: { id }, include });
  }
}

export default async function RecordDetailPage({ params }: { params: Params }) {
  const { type, id } = await params;
  if (!isRecordType(type)) notFound();
  const user = await requireActiveUser();

  const row = await loadRecord(type, id);
  if (!row || row.deletedAt) notFound();
  if (row.ownerId !== user.id && !isAdmin(user)) redirect("/yetkisiz");

  const deleteAction = async () => {
    "use server";
    await softDeleteRecord(type, id);
  };

  const { title, fields } = describe(type, row);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={title}
        description={RECORD_LABELS[type]}
        breadcrumbs={[
          { label: "Kayıtlarım", href: "/kayitlarim" },
          { label: RECORD_LABELS[type], href: `/kayitlarim?tur=${type}` },
          { label: title },
        ]}
        actions={
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href={`/kayitlarim?tur=${type}`}>
                <ArrowLeft className="h-4 w-4" />
                Geri
              </Link>
            </Button>
            <form action={deleteAction}>
              <Button type="submit" variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Sil
              </Button>
            </form>
          </div>
        }
      />

      <Card>
        <CardContent className="p-6">
          <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className={isLong(f.value) ? "md:col-span-2" : undefined}>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{f.label}</dt>
                <dd className="mt-1 text-sm text-foreground">{f.value ?? "—"}</dd>
              </div>
            ))}
          </dl>

          <Separator className="my-6" />

          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ek dosyalar</p>
          {row.attachments.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Ek dosya yok.</p>
          ) : (
            <ul className="mt-2 divide-y rounded-md border">
              {row.attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={`/api/dosya/${a.id}`}
                    className="min-w-0 flex-1 truncate text-primary hover:underline"
                    rel="noreferrer"
                  >
                    {a.originalName}
                  </a>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {Math.round(a.size / 1024)} KB
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-6 text-[11px] text-muted-foreground">
            Oluşturuldu {formatDateTime(row.createdAt)} · Güncellendi {formatDateTime(row.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function isLong(v: React.ReactNode) {
  return typeof v === "string" && v.length > 80;
}

/* ──────────────────────────────────────────────────────────────
 * Per-type field mapping. The `type` parameter already narrows the
 * row at the call site — we cast once via a small typed helper so
 * TS can reach individual fields without redundant guards.
 * ────────────────────────────────────────────────────────────── */
function describe(
  type: RecordTypeSlug,
  row: NonNullable<Awaited<ReturnType<typeof loadRecord>>>,
): { title: string; fields: FieldRow[] } {
  switch (type) {
    case "proje-basvurusu": {
      const r = row as Extract<typeof row, { partnerMemberIds: string[] }>;
      return {
        title: r.projectName,
        fields: [
          { label: "Program / fon", value: r.program },
          { label: "Çağrı adı", value: r.callName },
          { label: "Başvuru tarihi", value: formatDate(r.applicationDate) },
          { label: "Başvuru türü", value: PROJECT_APPLICATION_KIND_LABELS[r.kind] },
          { label: "Bütçe", value: r.budget?.toString() ?? null },
          { label: "Talep edilen destek", value: r.requestedSupport?.toString() ?? null },
          { label: "Proje Özeti", value: r.notes },
        ],
      };
    }
    case "basarili-proje": {
      const r = row as Extract<typeof row, { resultDate: Date | null }>;
      return {
        title: r.projectName,
        fields: [
          { label: "Program / fon", value: r.program },
          { label: "Çağrı adı", value: r.callName },
          { label: "Başvuru tarihi", value: formatDate(r.applicationDate) },
          { label: "Sonuç tarihi", value: formatDate(r.resultDate) },
          { label: "Toplam bütçe", value: r.totalBudget?.toString() ?? null },
          { label: "Destek tutarı", value: r.supportAmount?.toString() ?? null },
          { label: "Rol", value: r.role },
          { label: "Tür", value: r.kind },
          { label: "Proje konsorsiyumu", value: r.consortium },
          { label: "Proje Özeti", value: r.summary },
        ],
      };
    }
    case "proje-fikri": {
      const r = row as Extract<typeof row, { stage: string }>;
      return {
        title: r.title,
        fields: [
          { label: "Potansiyel program", value: r.potentialProgram },
          { label: "Çağrı / konu", value: r.callTopic },
          {
            label: "Aşama",
            value: <Badge variant="secondary">{PROJECT_IDEA_STAGE_LABELS[r.stage as keyof typeof PROJECT_IDEA_STAGE_LABELS]}</Badge>,
          },
          { label: "Hedef tarih", value: formatDate(r.targetDate) },
          { label: "Potansiyel ortaklar", value: r.potentialPartners },
          { label: "Sonraki adım", value: r.nextStep },
          { label: "Kısa açıklama", value: r.summary },
          { label: "Notlar", value: r.notes },
        ],
      };
    }
    case "etkinlik": {
      const r = row as Extract<typeof row, { name: string }>;
      // Legacy rows may have content in both `summary` and `notes`; merge
      // for display so old data isn't lost after the Faz 6 field merge.
      const description = [r.summary, r.notes].filter(Boolean).join("\n\n");
      return {
        title: r.name,
        fields: [
          { label: "Organizatör", value: r.organizer },
          { label: "Tür", value: r.kind },
          { label: "Şekli", value: r.format === "ONLINE" ? "Online" : r.format === "FIZIKI" ? "Fiziki" : null },
          { label: "Tarih", value: formatDate(r.date) },
          { label: "Yer", value: r.location },
          { label: "Etkinlikteki göreviniz", value: r.role },
          {
            label: "Etkinlik bağlantısı",
            value: r.externalUrl ? (
              <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-4 hover:underline">
                {r.externalUrl}
              </a>
            ) : null,
          },
          { label: "Etkinlik açıklaması", value: description || null },
        ],
      };
    }
    case "bilgi-cogaltimi": {
      const r = row as Extract<typeof row, { relatedTopic: string | null }>;
      return {
        title: r.title,
        fields: [
          { label: "Tarih", value: formatDate(r.date) },
          { label: "Yer / kurum", value: r.location },
          { label: "Tür", value: r.kind },
          { label: "Hedef kitle", value: r.audience },
          { label: "Katılımcı sayısı", value: r.participantCount?.toString() ?? null },
          { label: "İlgili konu", value: r.relatedTopic },
          { label: "Özet", value: r.summary },
          { label: "Notlar", value: r.notes },
        ],
      };
    }
    case "egitim-sunum": {
      // Disambiguate from DisseminationRecord by absence of `relatedTopic`.
      const r = row as Extract<typeof row, { audience: string | null; participantCount: number | null }> & {
        role: string | null;
      };
      return {
        title: r.title,
        fields: [
          { label: "Tarih", value: formatDate(r.date) },
          { label: "Yer", value: r.location },
          { label: "Hedef kitle", value: r.audience },
          { label: "Katılımcı sayısı", value: r.participantCount?.toString() ?? null },
          { label: "Rolünüz", value: r.role },
          { label: "İçerik özeti", value: r.summary },
          { label: "Notlar", value: r.notes },
        ],
      };
    }
    case "dokuman-icerik": {
      const r = row as Extract<typeof row, { tags: string[] }>;
      return {
        title: r.title,
        fields: [
          { label: "Döküman / İçerik türü", value: r.kind },
          { label: "Tarih", value: formatDate(r.date) },
          {
            label: "Etiketler",
            value:
              r.tags.length === 0 ? null : (
                <div className="flex flex-wrap gap-1">
                  {r.tags.map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                </div>
              ),
          },
          { label: "Açıklama", value: r.summary },
        ],
      };
    }
  }
}
