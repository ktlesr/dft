import Link from "next/link";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/empty-state";
import { requireActiveUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { canCreateNotice, isAdmin, isModerator } from "@/lib/rbac";
import { listNotices } from "@/features/notice/queries";
import { NewNoticeDialog } from "@/features/notice/new-notice-dialog";
import { NoticeCard } from "@/features/notice/notice-card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bildirimler" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ kanal?: string; q?: string }>;

export default async function DuyurularPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireActiveUser();
  const { kanal, q } = await searchParams;
  const channel: "genel" | "grup" = kanal === "grup" ? "grup" : "genel";

  const admin = isAdmin(user);
  const moderator = isModerator(user);

  // Group sahası: admin tüm grupları görür; üye sadece kendi grubunu.
  const myGroup = user.groupId
    ? await prisma.group.findUnique({
        where: { id: user.groupId },
        select: { id: true, code: true, name: true },
      })
    : null;
  const allGroups = admin
    ? await prisma.group.findMany({
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      })
    : [];

  const notices =
    channel === "genel"
      ? await listNotices({ scope: "GENERAL", query: q })
      : await listNotices({
          scope: "GROUP",
          groupId: admin ? undefined : user.groupId ?? undefined,
          allGroups: admin,
          query: q,
        });

  // Dialog yetenekleri
  const canCreateGeneral = admin;
  const groupsForGroupScope = admin ? allGroups : moderator && myGroup ? [myGroup] : [];

  const sectionTitle = channel === "genel" ? "Genel Bildirimler" : "Çalışma Grubu Bildirimleri";

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Bildirimler"
        description={
          channel === "genel"
            ? "DFT yönetimi tarafından tüm üyelere yapılan duyurular."
            : "Çalışma gruplarının kendi üyelerine yaptığı duyurular."
        }
        breadcrumbs={[{ label: "Bildirimler" }]}
        actions={
          <NewNoticeDialog
            kanal={channel}
            caps={{
              canCreateGeneral,
              groupsForGroupScope,
              // Pin yetkisi = oluşturma yetkisiyle aynı (admin her şey,
              // moderatör kendi grubu).
              canPin: admin || (moderator && groupsForGroupScope.length > 0),
            }}
            fixedGroupId={!admin && moderator && myGroup ? myGroup.id : null}
          />
        }
      />

      {/* Kanal seçici */}
      <div className="mb-5 flex flex-wrap gap-2">
        <ChannelButton
          href={mkHref("genel", q)}
          active={channel === "genel"}
          label="Genel Bildirimler"
        />
        <ChannelButton
          href={mkHref("grup", q)}
          active={channel === "grup"}
          label="Çalışma Grubu Bildirimleri"
        />
      </div>

      <form action="/duyurular" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="kanal" value={channel} />
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q ?? ""} placeholder="Bildirimlerde ara…" className="pl-9" />
        </div>
        <Button type="submit" variant="secondary">
          Ara
        </Button>
        {q ? (
          <Button asChild variant="ghost">
            <Link href={mkHref(channel, undefined)}>Temizle</Link>
          </Button>
        ) : null}
      </form>

      <section>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {sectionTitle}
        </h2>

        {notices.length === 0 ? (
          <EmptyState
            title={q ? "Sonuç bulunamadı" : "Henüz bildirim yok"}
            description={
              q
                ? "Farklı bir anahtar kelime deneyin."
                : channel === "genel"
                  ? "Yönetici yeni bir bildirim yayınladığında burada görünecek."
                  : moderator || admin
                    ? "İlk bildirimi oluşturmak için sağ üstteki düğmeyi kullanın."
                    : "Grup moderatörü yeni bir bildirim yayınladığında burada görünecek."
            }
          />
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <NoticeCard
                key={n.id}
                notice={n}
                caps={{
                  // Pin/unpin yetkisi: oluşturma yetkisiyle aynı kapsamda.
                  canPin: canCreateNotice(user, n.scope, n.groupId),
                  canRemove:
                    admin ||
                    n.authorId === user.id ||
                    (n.scope === "GROUP" &&
                      moderator &&
                      n.groupId !== null &&
                      n.groupId === user.groupId),
                  canEdit:
                    admin ||
                    n.authorId === user.id ||
                    (n.scope === "GROUP" &&
                      moderator &&
                      n.groupId !== null &&
                      n.groupId === user.groupId),
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function mkHref(channel: "genel" | "grup", q: string | undefined) {
  const p = new URLSearchParams();
  if (channel !== "genel") p.set("kanal", channel);
  if (q) p.set("q", q);
  const qs = p.toString();
  return qs ? `/duyurular?${qs}` : "/duyurular";
}

function ChannelButton({
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
