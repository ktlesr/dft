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
  APPLICANT_ROLE_LABELS,
  CONTENT_KIND_LABELS,
  EVENT_FORMAT_LABELS,
  EVENT_KIND_LABELS,
  EVENT_ROLE_LABELS,
  FUND_CATEGORY_LABELS,
  MEMBER_FUNCTION_LABELS,
  PROJECT_APPLICATION_KIND_LABELS,
  PROJECT_IDEA_STAGE_LABELS,
  STAKEHOLDER_KIND_LABELS,
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
    case "paydas":
      return prisma.stakeholderRecord.findUnique({ where: { id }, include });
  }
}

export default async function RecordDetailPage({ params }: { params: Params }) {
  const { type, id } = await params;
  if (!isRecordType(type)) notFound();
  const user = await requireActiveUser();

  const row = await loadRecord(type, id);
  if (!row || row.deletedAt) notFound();

  // Tüm aktif üyeler portal içi paylaşımları okuyabilir. Yazma / silme
  // ayrıcalığı yalnızca sahibe ve admin'e aittir; bu kontrol aşağıdaki
  // delete eylemi (`softDeleteRecord` → `mustOwnOr403`) içinde yapılıyor.
  const canDelete = row.ownerId === user.id || isAdmin(user);

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
            {canDelete ? (
              <form action={deleteAction}>
                <Button type="submit" variant="outline" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                  Sil
                </Button>
              </form>
            ) : null}
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

function externalLink(url: string | null) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline-offset-4 hover:underline">
      {url}
    </a>
  );
}

function fundLabel(category: string | null, sub: string | null) {
  if (!category && !sub) return null;
  const catLabel = category
    ? (FUND_CATEGORY_LABELS as Record<string, string>)[category] ?? category
    : null;
  if (catLabel && sub) return `${catLabel} · ${sub}`;
  return catLabel ?? sub;
}

function applicantRoleLabel(code: string | null) {
  if (!code) return null;
  return (APPLICANT_ROLE_LABELS as Record<string, string>)[code] ?? code;
}

function memberFunctionLabel(code: string | null) {
  if (!code) return null;
  return (MEMBER_FUNCTION_LABELS as Record<string, string>)[code] ?? code;
}

/* ──────────────────────────────────────────────────────────────
 * Per-type field mapping. Faz 8: yeni alanlar öncelikli; legacy
 * sütunlar yalnızca yenisi boş ise gösterilir.
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
          { label: "Fon türü", value: fundLabel(r.fundCategory, r.fundSubType) },
          { label: "Hibe sağlayıcısı", value: r.grantProvider },
          { label: "Program adı", value: r.programName ?? r.program },
          { label: "İlgili kurum / kuruluş", value: r.applicantOrg },
          { label: "Kurumun rolü", value: applicantRoleLabel(r.applicantRole) },
          { label: "Proje bütçesi", value: r.budget?.toString() ?? null },
          { label: "Destek miktarı", value: r.requestedSupport?.toString() ?? null },
          { label: "Başvuru tarihi", value: formatDate(r.applicationDate) },
          {
            label: "DFT üyesinin fonksiyonu",
            value: memberFunctionLabel(r.memberFunction) ?? PROJECT_APPLICATION_KIND_LABELS[r.kind],
          },
          { label: "Proje özeti", value: r.notes },
        ],
      };
    }
    case "basarili-proje": {
      const r = row as Extract<typeof row, { resultDate: Date | null }>;
      return {
        title: r.projectName,
        fields: [
          { label: "Fon türü", value: fundLabel(r.fundCategory, r.fundSubType) },
          { label: "Hibe sağlayıcısı", value: r.grantProvider },
          { label: "Program adı", value: r.programName ?? r.program },
          { label: "İlgili kurum / kuruluş", value: r.applicantOrg },
          { label: "Kurumun rolü", value: applicantRoleLabel(r.applicantRole) },
          { label: "Proje bütçesi", value: r.totalBudget?.toString() ?? null },
          { label: "Destek miktarı", value: r.supportAmount?.toString() ?? null },
          { label: "Başvuru tarihi", value: formatDate(r.applicationDate) },
          { label: "Proje kabul tarihi", value: formatDate(r.acceptanceDate ?? r.resultDate) },
          { label: "DFT üyesinin fonksiyonu", value: memberFunctionLabel(r.memberFunction) },
          { label: "Konsorsiyum (legacy)", value: r.consortium },
          { label: "Proje özeti", value: r.summary },
        ],
      };
    }
    case "proje-fikri": {
      const r = row as Extract<typeof row, { stage: string }>;
      const stageLegacy = r.stage && r.stage !== "FIKIR" ? (
        <Badge variant="secondary">{PROJECT_IDEA_STAGE_LABELS[r.stage as keyof typeof PROJECT_IDEA_STAGE_LABELS] ?? r.stage}</Badge>
      ) : null;
      return {
        title: r.title,
        fields: [
          { label: "Hibe sağlayıcısı", value: r.grantProvider },
          { label: "İlgili program", value: r.potentialProgram },
          { label: "Proje bütçesi", value: r.budget?.toString() ?? null },
          { label: "Proje özeti", value: r.summary },
          // Legacy alanlar — yalnızca dolu ise.
          { label: "Aşama (legacy)", value: stageLegacy },
          { label: "Çağrı / konu (legacy)", value: r.callTopic },
          { label: "Potansiyel ortaklar (legacy)", value: r.potentialPartners },
          { label: "Sonraki adım (legacy)", value: r.nextStep },
          { label: "Hedef tarih (legacy)", value: formatDate(r.targetDate) },
          { label: "Notlar (legacy)", value: r.notes },
        ].filter((f) => f.value !== null && f.value !== ""),
      };
    }
    case "etkinlik": {
      const r = row as Extract<typeof row, { name: string }>;
      const description = [r.summary, r.notes].filter(Boolean).join("\n\n");
      const kindLabel = r.kind ? (EVENT_KIND_LABELS as Record<string, string>)[r.kind] ?? r.kind : null;
      const formatLabel = r.format ? (EVENT_FORMAT_LABELS as Record<string, string>)[r.format] ?? r.format : null;
      const roleLabel = r.role ? (EVENT_ROLE_LABELS as Record<string, string>)[r.role] ?? r.role : null;
      return {
        title: r.name,
        fields: [
          { label: "Düzenleyen kuruluş", value: r.organizer },
          { label: "Tarih", value: formatDate(r.date) },
          { label: "Etkinlik türü", value: kindLabel },
          { label: "Etkinlik yöntemi", value: formatLabel },
          { label: "Rolünüz", value: roleLabel },
          { label: "Etkinlik bağlantısı", value: externalLink(r.externalUrl) },
          { label: "Yer (legacy)", value: r.location },
          { label: "Açıklama", value: description || null },
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
      // Disambiguate from Stakeholder (also has `tags`) via `mainDocument`.
      const r = row as Extract<typeof row, { mainDocument: string | null }>;
      const kindLabel = r.kind ? (CONTENT_KIND_LABELS as Record<string, string>)[r.kind] ?? r.kind : null;
      return {
        title: r.title,
        fields: [
          { label: "Tür", value: kindLabel },
          { label: "Bağlantı", value: externalLink(r.externalUrl) },
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
    case "paydas": {
      const r = row as Extract<typeof row, { fullName: string }>;
      const kindLabel = (STAKEHOLDER_KIND_LABELS as Record<string, string>)[r.kind] ?? r.kind;
      return {
        title: r.fullName,
        fields: [
          { label: "Ünvan", value: r.positionTitle },
          { label: "Paydaş türü", value: kindLabel },
          { label: "Kuruluş", value: r.organization },
          { label: "LinkedIn", value: externalLink(r.linkedinUrl) },
          { label: "E-posta", value: r.email },
          { label: "Şehir", value: r.city },
          { label: "Ülke", value: r.country },
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
          { label: "Açıklama", value: r.description },
        ],
      };
    }
  }
}
