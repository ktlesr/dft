import Link from "next/link";
import { CalendarClock, ExternalLink, Paperclip, Pencil, Pin, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayUrl, LinkifiedText } from "@/features/shared/linkified-text";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { groupBadgeClass } from "@/lib/group-badge";
import { formatDateTime } from "@/lib/utils";
import type { NoticeWithAuthor } from "./queries";
import { removeNotice, toggleNoticePin } from "./actions";

type Props = {
  notice: NoticeWithAuthor;
  caps: { canPin: boolean; canRemove: boolean; canEdit: boolean };
};

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function NoticeCard({ notice, caps }: Props) {
  const author = notice.author.name?.trim() || notice.author.email.split("@")[0];

  const togglePinAction = async () => {
    "use server";
    await toggleNoticePin(notice.id);
  };

  const removeAction = async () => {
    "use server";
    await removeNotice(notice.id);
  };

  return (
    <Card className={notice.pinned ? "border-amber-300/60" : undefined}>
      <CardContent className="space-y-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {notice.pinned ? (
            <Pin className="h-3.5 w-3.5 text-amber-600" aria-label="Sabit" />
          ) : null}
          <h3 className="text-sm font-semibold">{notice.title}</h3>
          <Badge variant="secondary" className="text-[10px]">
            {BOARD_KIND_LABELS[notice.kind]}
          </Badge>
          {notice.scope === "GROUP" && notice.group ? (
            <Badge variant="outline" className={groupBadgeClass(notice.group.code, "text-[10px]")}>
              {notice.group.code}
            </Badge>
          ) : null}
          {notice.scope === "GENERAL" ? (
            <Badge variant="success" className="text-[10px]">
              Genel
            </Badge>
          ) : null}
        </div>

        {notice.eventStartAt || notice.eventEndAt || notice.eventAt ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <CalendarClock className="h-3.5 w-3.5" />
            <span>
              {notice.eventStartAt && notice.eventEndAt
                ? `${formatDateTime(notice.eventStartAt)} - ${formatDateTime(notice.eventEndAt)}`
                : formatDateTime(notice.eventStartAt ?? notice.eventEndAt ?? notice.eventAt!)}
            </span>
          </div>
        ) : null}

        <LinkifiedText text={notice.body} className="text-sm leading-relaxed text-foreground" />

        {notice.externalUrl ? (
          <a
            href={notice.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={notice.externalUrl}
            className="inline-flex max-w-full items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{displayUrl(notice.externalUrl)}</span>
          </a>
        ) : null}

        {notice.attachments.length > 0 ? (
          <ul className="space-y-1 pt-1">
            {notice.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={`/api/dosya/${a.id}`}
                  className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border bg-muted/40 px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted hover:text-primary"
                  rel="noreferrer"
                >
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="truncate">{a.originalName}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {humanSize(a.size)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <p className="text-[11px] text-muted-foreground">
            {author} · {formatDateTime(notice.publishedAt)}
          </p>
          <div className="flex items-center gap-1">
            {caps.canEdit ? (
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Link href={`/bildirim/${notice.id}/duzenle`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Düzenle
                </Link>
              </Button>
            ) : null}
            {caps.canPin ? (
              <form action={togglePinAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  aria-label={notice.pinned ? "Sabitlemeyi kaldır" : "Üste sabitle"}
                >
                  <Pin className="h-3.5 w-3.5" />
                  {notice.pinned ? "Sabit kaldır" : "Sabitle"}
                </Button>
              </form>
            ) : null}
            {caps.canRemove ? (
              <form action={removeAction}>
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  aria-label="Bildirimi sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Sil
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
