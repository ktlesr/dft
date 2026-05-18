import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Lock, MessageCircle, Paperclip, Pin, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireActiveUser } from "@/lib/current-user";
import { isAdmin, isModerator } from "@/lib/rbac";
import { avatarUrl, formatDateTime, initials } from "@/lib/utils";
import { getDiscussion } from "@/features/forum/queries";
import { ReplyForm } from "@/features/forum/reply-form";
import { removeDiscussion, removeReply } from "@/features/forum/actions";

export const metadata = { title: "Tartışma" };
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function DiscussionPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireActiveUser();
  const discussion = await getDiscussion(id);

  if (!discussion || discussion.deletedAt) notFound();

  // Aynı gruba aitlik kontrolü; admin tüm gruplar.
  if (!isAdmin(user) && discussion.groupId !== user.groupId) {
    redirect("/yetkisiz");
  }

  const canDeleteTopic =
    discussion.authorId === user.id ||
    isAdmin(user) ||
    (isModerator(user) && discussion.groupId === user.groupId);

  const canReply =
    !discussion.locked ||
    isAdmin(user) ||
    (isModerator(user) && discussion.groupId === user.groupId);

  const topicAuthorName =
    discussion.author.name?.trim() || discussion.author.email.split("@")[0];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={discussion.title}
        description={discussion.group ? `${discussion.group.code} · Forum` : "Forum"}
        breadcrumbs={[
          { label: "Çalışma Grubum", href: "/calisma-grubum" },
          { label: "Forum", href: "/calisma-grubum?sekme=forum" },
          { label: discussion.title },
        ]}
        actions={
          <Button asChild variant="ghost">
            <Link href="/calisma-grubum?sekme=forum">
              <ArrowLeft className="h-4 w-4" />
              Geri
            </Link>
          </Button>
        }
      />

      {/* Tartışmanın açılış mesajı */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              {discussion.author.image ? (
                <AvatarImage
                  src={avatarUrl(discussion.author.id, discussion.author.image)}
                  alt={topicAuthorName}
                />
              ) : null}
              <AvatarFallback>
                {initials(discussion.author.name, discussion.author.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{topicAuthorName}</p>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(discussion.createdAt)}
                </span>
                {discussion.pinned ? (
                  <Badge variant="warning" className="text-[10px]">
                    <Pin className="mr-1 h-3 w-3" />
                    Sabit
                  </Badge>
                ) : null}
                {discussion.locked ? (
                  <Badge variant="muted" className="text-[10px]">
                    <Lock className="mr-1 h-3 w-3" />
                    Kilitli
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {discussion.body}
              </p>

              {discussion.attachments.length > 0 ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {discussion.attachments.map((a) => (
                    <li key={a.id}>
                      <a
                        href={`/api/dosya/${a.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted hover:text-primary"
                        rel="noreferrer"
                      >
                        <Paperclip className="h-3 w-3 shrink-0" />
                        <span className="max-w-[260px] truncate">{a.originalName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {a.size < 1024
                            ? `${a.size} B`
                            : a.size < 1024 * 1024
                              ? `${Math.round(a.size / 1024)} KB`
                              : `${(a.size / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {canDeleteTopic ? (
            <div className="flex justify-end border-t pt-3">
              <form action={removeDiscussion}>
                <input type="hidden" name="discussionId" value={discussion.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Tartışmayı sil
                </Button>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Yanıtlar */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          Yanıtlar ({discussion.replies.length})
        </h2>

        {discussion.replies.length === 0 ? (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Henüz yanıt yok. İlk yanıtı siz yazın.
          </p>
        ) : (
          <ul className="space-y-3">
            {discussion.replies.map((r) => {
              const replyAuthorName = r.author.name?.trim() || r.author.email.split("@")[0];
              const canDeleteReply =
                r.authorId === user.id ||
                isAdmin(user) ||
                (isModerator(user) && discussion.groupId === user.groupId);
              return (
                <li key={r.id}>
                  <Card>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          {r.author.image ? (
                            <AvatarImage
                              src={avatarUrl(r.author.id, r.author.image)}
                              alt={replyAuthorName}
                            />
                          ) : null}
                          <AvatarFallback>
                            {initials(r.author.name, r.author.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">{replyAuthorName}</p>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateTime(r.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                            {r.body}
                          </p>
                        </div>
                        {canDeleteReply ? (
                          <form action={removeReply}>
                            <input type="hidden" name="replyId" value={r.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              aria-label="Yanıtı sil"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Yanıt formu */}
      <Separator className="my-6" />
      {canReply ? (
        <ReplyForm discussionId={discussion.id} />
      ) : (
        <p className="rounded-md border border-dashed px-4 py-3 text-center text-sm text-muted-foreground">
          Bu tartışma yanıtlara kapalı.
        </p>
      )}
    </div>
  );
}
