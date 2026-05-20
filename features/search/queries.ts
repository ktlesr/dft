import "server-only";

import type { CurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { listMyRecords } from "@/features/records/queries";
import { RECORD_LABELS } from "@/features/records/types";
import {
  BOARD_KIND_LABELS,
  DOCUMENT_CATEGORY_LABELS,
  REPORT_KIND_LABELS,
} from "@/lib/constants";
import { formatDate, truncate } from "@/lib/utils";

/**
 * Per-section result cap. Search is intentionally a "narrow and refocus"
 * experience: 5 per section keeps the page fast and scannable. Users who
 * want all hits for a category click through to the listing screen.
 */
const PER_GROUP = 5;
const DFT_ADMIN_EMAIL = "admin@dft.ktlsr.com";

export type SearchItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
};

export type SearchGroup = {
  key: "boards" | "records" | "meetings" | "minutes" | "reports" | "documents" | "users";
  label: string;
  items: SearchItem[];
};

export type SearchOutcome = {
  groups: SearchGroup[];
  totalShown: number;
};

/**
 * Global cross-entity search over the portal, constrained by the viewer's
 * role + group visibility. Returns an empty outcome for queries shorter
 * than 2 characters.
 */
export async function globalSearch(user: CurrentUser, rawQuery: string): Promise<SearchOutcome> {
  const query = rawQuery.trim();
  if (query.length < 2) return { groups: [], totalShown: 0 };

  const admin = isAdmin(user);
  const ci = (field: string) => ({
    [field]: { contains: query, mode: "insensitive" as const },
  });

  /* ── Board posts ──────────────────────────────────────────────── */
  const boardScope = admin
    ? null
    : user.groupId
      ? {
          OR: [
            { scope: "GENERAL" as const },
            { scope: "GROUP" as const, groupId: user.groupId },
          ],
        }
      : { scope: "GENERAL" as const };

  const boardsPromise = prisma.boardPost.findMany({
    where: {
      deletedAt: null,
      status: "PUBLISHED",
      AND: [
        { OR: [ci("title"), ci("body")] },
        ...(boardScope ? [boardScope] : []),
      ],
    },
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: PER_GROUP,
    include: { author: { select: { name: true, email: true } } },
  });

  /* ── Personal records (7 types, owner-scoped) ─────────────────── */
  const recordsPromise = listMyRecords(user.id, { query, take: PER_GROUP });

  /* ── Meetings (group-scoped) ──────────────────────────────────── */
  const meetingsPromise =
    admin || user.groupId
      ? prisma.meeting.findMany({
          where: {
            deletedAt: null,
            AND: [
              {
                OR: [
                  ci("title"),
                  ci("location"),
                  ci("description"),
                  ci("agenda"),
                ],
              },
              ...(admin ? [] : [{ groupId: user.groupId! }]),
            ],
          },
          orderBy: { startAt: "desc" },
          take: PER_GROUP,
          include: { group: { select: { code: true } } },
        })
      : Promise.resolve([]);

  /* ── Meeting minutes (via parent meeting group) ──────────────── */
  const minutesPromise =
    admin || user.groupId
      ? prisma.meetingMinute.findMany({
          where: {
            deletedAt: null,
            AND: [
              {
                OR: [
                  ci("attendees"),
                  ci("topics"),
                  ci("decisions"),
                  ci("summary"),
                ],
              },
              ...(admin ? [] : [{ meeting: { groupId: user.groupId! } }]),
            ],
          },
          orderBy: { date: "desc" },
          take: PER_GROUP,
          include: { meeting: { select: { id: true, title: true } } },
        })
      : Promise.resolve([]);

  /* ── Group reports (group-scoped) ─────────────────────────────── */
  const reportsPromise =
    admin || user.groupId
      ? prisma.report.findMany({
          where: {
            deletedAt: null,
            AND: [
              {
                OR: [
                  ci("title"),
                  ci("summary"),
                  ci("body"),
                  ci("outputs"),
                ],
              },
              ...(admin ? [] : [{ groupId: user.groupId! }]),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: PER_GROUP,
          include: { group: { select: { code: true } } },
        })
      : Promise.resolve([]);

  /* ── Documents (category-based visibility) ───────────────────── */
  const docAccess = admin
    ? null
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

  const documentsPromise = prisma.document.findMany({
    where: {
      deletedAt: null,
      AND: [
        { OR: [ci("title"), ci("description")] },
        ...(docAccess ? [docAccess] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    take: PER_GROUP,
    include: { group: { select: { code: true } } },
  });

  /* ── Users (admin only) ──────────────────────────────────────── */
  const usersPromise = admin
    ? prisma.user.findMany({
        where: {
          AND: [
            { OR: [ci("name"), ci("email")] },
            { NOT: { email: { equals: DFT_ADMIN_EMAIL, mode: "insensitive" } } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: PER_GROUP,
        include: { group: { select: { code: true } } },
      })
    : Promise.resolve([]);

  const [boards, records, meetings, minutes, reports, documents, users] =
    await Promise.all([
      boardsPromise,
      recordsPromise,
      meetingsPromise,
      minutesPromise,
      reportsPromise,
      documentsPromise,
      usersPromise,
    ]);

  const groups: SearchGroup[] = [];

  if (boards.length > 0) {
    groups.push({
      key: "boards",
      label: "Panolar",
      items: boards.map((b) => ({
        id: b.id,
        title: b.title,
        subtitle: [
          BOARD_KIND_LABELS[b.kind],
          b.author.name ?? b.author.email,
          truncate(b.body, 80),
        ]
          .filter(Boolean)
          .join(" · "),
        href: b.scope === "GENERAL" ? "/panolar/genel" : "/panolar/grup",
      })),
    });
  }

  if (records.length > 0) {
    groups.push({
      key: "records",
      label: "Paylaşımlar",
      items: records.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: [RECORD_LABELS[r.type], r.subtitle, formatDate(r.date)]
          .filter(Boolean)
          .join(" · "),
        href: `/kayitlarim/${r.type}/${r.id}`,
      })),
    });
  }

  if (meetings.length > 0) {
    groups.push({
      key: "meetings",
      label: "Toplantılar",
      items: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        subtitle: [m.group?.code, formatDate(m.startAt), m.location]
          .filter(Boolean)
          .join(" · "),
        href: `/toplanti/${m.id}`,
      })),
    });
  }

  if (minutes.length > 0) {
    groups.push({
      key: "minutes",
      label: "Tutanaklar",
      items: minutes.map((m) => ({
        id: m.id,
        title: m.meeting ? `${m.meeting.title} — tutanak` : "Tutanak",
        subtitle: [formatDate(m.date), truncate(m.summary ?? m.decisions, 80)]
          .filter(Boolean)
          .join(" · "),
        href: m.meeting ? `/toplanti/${m.meeting.id}` : "/calisma-grubum",
      })),
    });
  }

  if (reports.length > 0) {
    groups.push({
      key: "reports",
      label: "Raporlar",
      items: reports.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: [r.group?.code, REPORT_KIND_LABELS[r.kind], formatDate(r.createdAt)]
          .filter(Boolean)
          .join(" · "),
        href: `/rapor/${r.id}`,
      })),
    });
  }

  if (documents.length > 0) {
    groups.push({
      key: "documents",
      label: "Belgeler",
      items: documents.map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: [
          DOCUMENT_CATEGORY_LABELS[d.category],
          d.group?.code,
          d.description ? truncate(d.description, 80) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        href: "/belgeler",
      })),
    });
  }

  if (users.length > 0) {
    groups.push({
      key: "users",
      label: "Kullanıcılar",
      items: users.map((u) => ({
        id: u.id,
        title: u.name ?? u.email,
        subtitle: [u.email, u.group?.code, u.status].filter(Boolean).join(" · "),
        href: `/yonetim/kullanicilar/${u.id}`,
      })),
    });
  }

  const totalShown = groups.reduce((sum, g) => sum + g.items.length, 0);
  return { groups, totalShown };
}
