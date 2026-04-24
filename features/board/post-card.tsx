import Link from "next/link";
import { ExternalLink, Paperclip, Pin, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { avatarUrl, formatDateTime, initials } from "@/lib/utils";
import { removeBoardPost, togglePin } from "./actions";

type PostRow = {
  id: string;
  scope: "GENERAL" | "GROUP";
  kind: keyof typeof BOARD_KIND_LABELS;
  title: string;
  body: string;
  assessment?: string | null;
  tags: string[];
  externalUrl: string | null;
  pinned: boolean;
  publishedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  attachments: { id: string; originalName: string; size: number }[];
};

type Caps = {
  canPin: boolean;
  canRemove: boolean;
};

export function PostCard({ post, caps }: { post: PostRow; caps: Caps }) {
  const pinAction = async () => {
    "use server";
    await togglePin(post.id);
  };
  const removeAction = async () => {
    "use server";
    await removeBoardPost(post.id);
  };

  return (
    <Card className={post.pinned ? "border-primary/40" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            {post.author.image ? (
              <AvatarImage
                src={avatarUrl(post.author.id, post.author.image)}
                alt={post.author.name ?? post.author.email}
              />
            ) : null}
            <AvatarFallback>{initials(post.author.name, post.author.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{post.author.name ?? post.author.email}</span>
              <span className="text-[11px] text-muted-foreground">
                · {formatDateTime(post.publishedAt)}
              </span>
              <Badge variant="secondary">{BOARD_KIND_LABELS[post.kind]}</Badge>
              {post.pinned ? (
                <Badge variant="warning" className="gap-1">
                  <Pin className="h-3 w-3" />
                  Sabit
                </Badge>
              ) : null}
            </div>

            <h3 className="mt-2 text-base font-semibold leading-snug">{post.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.body}</p>

            {post.assessment ? (
              <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  TR33 Bölgesi açısından değerlendirme
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{post.assessment}</p>
              </div>
            ) : null}

            {post.externalUrl ? (
              <a
                href={post.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Harici bağlantı
              </a>
            ) : null}

            {post.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {post.tags.map((t) => (
                  <Badge key={t} variant="outline" className="font-normal">
                    #{t}
                  </Badge>
                ))}
              </div>
            ) : null}

            {post.attachments.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {post.attachments.map((a) => (
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
            ) : null}

            {caps.canPin || caps.canRemove ? (
              <div className="mt-3 flex items-center justify-end gap-1">
                {caps.canPin ? (
                  <form action={pinAction}>
                    <Button type="submit" variant="ghost" size="sm">
                      <Pin className="h-3.5 w-3.5" />
                      {post.pinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                    </Button>
                  </form>
                ) : null}
                {caps.canRemove ? (
                  <form action={removeAction}>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Kaldır
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
