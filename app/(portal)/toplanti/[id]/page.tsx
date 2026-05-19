import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, ExternalLink, MapPin, Paperclip, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { redirectUnauthorized, requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canSeeGroupResource, isAdmin } from "@/lib/rbac";
import { formatDate, formatDateTime } from "@/lib/utils";
import { removeMeeting } from "@/features/meeting/actions";

export const dynamic = "force-dynamic";
type Params = Promise<{ id: string }>;

export default async function MeetingDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      attachments: { select: { id: true, originalName: true, size: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      group: { select: { code: true } },
      minutes: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        include: {
          author: { select: { id: true, name: true, email: true } },
          attachments: { select: { id: true, originalName: true, size: true } },
        },
      },
    },
  });
  if (!meeting || meeting.deletedAt) notFound();
  if (!canSeeGroupResource(user, meeting.groupId)) await redirectUnauthorized();

  const canRemove = isAdmin(user) || meeting.createdById === user.id;
  const canAddMinute =
    isAdmin(user) || (user.roles.includes("RAPPORTEUR") && user.groupId === meeting.groupId);

  const removeAction = async () => {
    "use server";
    await removeMeeting(id);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={meeting.title}
        description={`${meeting.group?.code ?? ""} grubu · ${formatDateTime(meeting.startAt)}`}
        breadcrumbs={[
          { label: "Çalışma Grubum", href: "/calisma-grubum" },
          { label: "Toplantı" },
        ]}
        actions={
          <div className="flex gap-2">
            {canAddMinute ? (
              <Button asChild variant="secondary">
                <Link href={`/tutanak/yeni?toplanti=${meeting.id}`}>
                  <Plus className="h-4 w-4" />
                  Tutanak ekle
                </Link>
              </Button>
            ) : null}
            {canRemove ? (
              <form action={removeAction}>
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
        <CardContent className="space-y-4 p-6">
          <dl className="grid gap-x-6 gap-y-3 md:grid-cols-2">
            <Info label="Başlangıç" value={<span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4 text-muted-foreground" />{formatDateTime(meeting.startAt)}</span>} />
            <Info label="Bitiş" value={meeting.endAt ? formatDateTime(meeting.endAt) : "—"} />
            <Info
              label="Yer"
              value={
                meeting.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {meeting.location}
                  </span>
                ) : (
                  "—"
                )
              }
            />
            <Info
              label="Çevrim içi"
              value={
                meeting.onlineUrl ? (
                  <a
                    href={meeting.onlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Bağlantı
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Info label="Düzenleyen" value={meeting.createdBy.name ?? meeting.createdBy.email} />
            {meeting.pinToBoard ? (
              <Info label="Grup panosu" value={<Badge variant="warning">Sabitli</Badge>} />
            ) : null}
          </dl>

          {meeting.description ? (
            <>
              <Separator />
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Kısa açıklama</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{meeting.description}</p>
              </section>
            </>
          ) : null}

          {meeting.agenda ? (
            <>
              <Separator />
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Gündem</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{meeting.agenda}</p>
              </section>
            </>
          ) : null}

          {meeting.attachments.length > 0 ? (
            <>
              <Separator />
              <section>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ek dosyalar</p>
                <ul className="mt-2 space-y-1">
                  {meeting.attachments.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/api/dosya/${a.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {a.originalName}
                        <span className="text-muted-foreground">· {Math.round(a.size / 1024)} KB</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Tutanaklar</CardTitle>
        </CardHeader>
        <CardContent>
          {meeting.minutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu toplantıya ait tutanak henüz eklenmemiş.</p>
          ) : (
            <ul className="space-y-3">
              {meeting.minutes.map((m) => (
                <li key={m.id} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{formatDate(m.date)} tarihli tutanak</p>
                    <span className="text-[11px] text-muted-foreground">
                      {m.author.name ?? m.author.email}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {m.summary ?? m.decisions.slice(0, 280)}
                  </p>
                  {m.attachments.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.attachments.map((a) => (
                        <Link
                          key={a.id}
                          href={`/api/dosya/${a.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          {a.originalName}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
