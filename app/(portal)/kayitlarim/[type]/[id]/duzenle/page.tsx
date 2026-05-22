import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/page-header";
import { requireActiveUser, redirectUnauthorized } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import {
  updateContentRecord,
  updateDissemination,
  updateEventRecord,
  updateProjectApplication,
  updateProjectIdea,
  updateStakeholder,
  updateSuccessfulProject,
  updateTraining,
} from "@/features/records/actions";
import { ContentForm } from "@/features/records/content-form";
import { DisseminationForm } from "@/features/records/dissemination-form";
import { EventForm } from "@/features/records/event-form";
import { ProjectApplicationForm } from "@/features/records/project-application-form";
import { ProjectIdeaForm } from "@/features/records/project-idea-form";
import { StakeholderForm } from "@/features/records/stakeholder-form";
import { SuccessfulProjectForm } from "@/features/records/successful-project-form";
import { TrainingForm } from "@/features/records/training-form";
import { RECORD_LABELS, isRecordType, type RecordTypeSlug } from "@/features/records/types";
import type { CurrencyCode } from "@/features/records/schemas";

export const metadata = { title: "Kaydı düzenle" };
export const dynamic = "force-dynamic";

type Params = Promise<{ type: string; id: string }>;

function asCurrency(value: string | null | undefined): CurrencyCode {
  if (value === "EUR" || value === "USD") return value;
  return "TRY";
}

function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value));
  return Number.isFinite(n) ? n : 0;
}

function dateOnly(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function dateTimeLocal(value: Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function EditRecordPage({ params }: { params: Params }) {
  const { type, id } = await params;
  if (!isRecordType(type)) notFound();

  const user = await requireActiveUser();
  const cancelHref = `/kayitlarim/${type}/${id}`;
  const form = await renderEditForm(type, id, cancelHref);
  if (!form) notFound();

  if (form.ownerId !== user.id && !isAdmin(user)) await redirectUnauthorized();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${RECORD_LABELS[type]} düzenle`}
        description="Kaydı güncelleyin."
        breadcrumbs={[
          { label: "Kayıtlar", href: "/kayitlarim" },
          { label: RECORD_LABELS[type], href: `/kayitlarim?tur=${type}` },
          { label: form.title, href: cancelHref },
          { label: "Düzenle" },
        ]}
      />
      {form.node}
    </div>
  );
}

async function renderEditForm(type: RecordTypeSlug, id: string, cancelHref: string) {
  switch (type) {
    case "proje-basvurusu": {
      const row = await prisma.projectApplicationRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.projectName,
        node: (
          <ProjectApplicationForm
            action={updateProjectApplication.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              projectName: row.projectName,
              fundCategory: row.fundCategory,
              fundSubType: row.fundSubType,
              grantProvider: row.grantProvider,
              programName: row.programName ?? row.program,
              applicantOrg: row.applicantOrg,
              applicantRole: row.applicantRole,
              budget: money(row.budget),
              requestedSupport: money(row.requestedSupport),
              currency: asCurrency(row.currency),
              applicationDate: dateOnly(row.applicationDate),
              isPhased: row.isPhased,
              applicationPhase: row.applicationPhase,
              memberFunction: row.memberFunction,
              notes: row.notes,
            }}
          />
        ),
      };
    }
    case "basarili-proje": {
      const row = await prisma.successfulProjectRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.projectName,
        node: (
          <SuccessfulProjectForm
            action={updateSuccessfulProject.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              projectName: row.projectName,
              fundCategory: row.fundCategory,
              fundSubType: row.fundSubType,
              grantProvider: row.grantProvider,
              programName: row.programName ?? row.program,
              applicantOrg: row.applicantOrg,
              applicantRole: row.applicantRole,
              totalBudget: money(row.totalBudget),
              supportAmount: money(row.supportAmount),
              currency: asCurrency(row.currency),
              applicationDate: dateOnly(row.applicationDate),
              acceptanceDate: dateOnly(row.acceptanceDate ?? row.resultDate),
              memberFunction: row.memberFunction,
              summary: row.summary,
            }}
          />
        ),
      };
    }
    case "proje-fikri": {
      const row = await prisma.projectIdeaRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.title,
        node: (
          <ProjectIdeaForm
            action={updateProjectIdea.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              title: row.title,
              grantProvider: row.grantProvider,
              potentialProgram: row.potentialProgram,
              budget: money(row.budget),
              currency: asCurrency(row.currency),
              summary: row.summary,
            }}
          />
        ),
      };
    }
    case "etkinlik": {
      const row = await prisma.eventRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.name,
        node: (
          <EventForm
            action={updateEventRecord.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              name: row.name,
              organizer: row.organizer,
              date: dateTimeLocal(row.date),
              endAt: dateTimeLocal(row.endAt),
              kind: row.kind,
              format: row.format,
              role: row.role,
              externalUrl: row.externalUrl,
              summary: row.summary,
            }}
          />
        ),
      };
    }
    case "dokuman-icerik": {
      const row = await prisma.contentRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.title,
        node: (
          <ContentForm
            action={updateContentRecord.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              title: row.title,
              kind: row.kind,
              externalUrl: row.externalUrl,
              tags: row.tags,
              summary: row.summary,
            }}
          />
        ),
      };
    }
    case "bilgi-cogaltimi": {
      const row = await prisma.disseminationRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.title,
        node: (
          <DisseminationForm
            action={updateDissemination.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              title: row.title,
              date: dateOnly(row.date),
              location: row.location,
              kind: row.kind,
              audience: row.audience,
              participantCount: row.participantCount,
              relatedTopic: row.relatedTopic,
              summary: row.summary,
              notes: row.notes,
            }}
          />
        ),
      };
    }
    case "egitim-sunum": {
      const row = await prisma.trainingPresentationRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.title,
        node: (
          <TrainingForm
            action={updateTraining.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              title: row.title,
              date: dateOnly(row.date),
              location: row.location,
              audience: row.audience,
              participantCount: row.participantCount,
              role: row.role,
              summary: row.summary,
              notes: row.notes,
            }}
          />
        ),
      };
    }
    case "paydas": {
      const row = await prisma.stakeholderRecord.findUnique({ where: { id } });
      if (!row || row.deletedAt) return null;
      return {
        ownerId: row.ownerId,
        title: row.fullName,
        node: (
          <StakeholderForm
            action={updateStakeholder.bind(null, id)}
            cancelHref={cancelHref}
            submitLabel="Güncelle"
            defaults={{
              fullName: row.fullName,
              positionTitle: row.positionTitle,
              kind: row.kind,
              organization: row.organization,
              linkedinUrl: row.linkedinUrl,
              email: row.email,
              city: row.city,
              country: row.country,
              tags: row.tags,
              description: row.description,
            }}
          />
        ),
      };
    }
    default:
      return null;
  }
}
