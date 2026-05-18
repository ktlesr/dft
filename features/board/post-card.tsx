import Link from "next/link";
import { ExternalLink, Paperclip, Pin, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BOARD_KIND_LABELS } from "@/lib/constants";
import { avatarUrl, formatDateTime, initials } from "@/lib/utils";
import { removeBoardPost, togglePin } from "./actions";
import { CoverImageLightbox } from "./cover-image-lightbox";
import { EditBoardPostDialog } from "./edit-post-dialog";

type Attachment = {
  id: string;
  originalName: string;
  size: number;
  /** Faz 10: kapak resmi belirleyebilmek için mimeType da projeksiyondan gelir. */
  mimeType?: string;
};

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
  attachments: Attachment[];
};

type Caps = {
  canPin: boolean;
  canRemove: boolean;
  /** Faz 10: yalnızca admin paylaşımı düzenleyebilir. */
  canEdit?: boolean;
};

function isImage(mime?: string): boolean {
  return !!mime && mime.startsWith("image/");
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function PostCard({ post, caps }: { post: PostRow; caps: Caps }) {
  const pinAction = async () => {
    "use server";
    await togglePin(post.id);
  };
  const removeAction = async () => {
    "use server";
    await removeBoardPost(post.id);
  };

  // Ek dosyaları üç gruba ayırırız:
  //  - coverImage: ilk image (kart sol üstte büyük kapak)
  //  - extraImages: kalan image'lar (kapak altında küçük thumbnail + lightbox)
  //  - fileAttachments: image olmayan ekler (link listesi → indir)
  const images = post.attachments.filter((a) => isImage(a.mimeType));
  const coverImage = images[0];
  const extraImages = images.slice(1);
  const fileAttachments = post.attachments.filter((a) => !isImage(a.mimeType));

  return (
    <Card className={post.pinned ? "border-primary/40" : undefined}>
      <CardContent className="p-5">
        {/* Üst meta — avatar + yazar + tarih + rozetler */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Avatar className="h-7 w-7 shrink-0">
            {post.author.image ? (
              <AvatarImage
                src={avatarUrl(post.author.id, post.author.image)}
                alt={post.author.name ?? post.author.email}
              />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {initials(post.author.name, post.author.email)}
            </AvatarFallback>
          </Avatar>
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

        {/* İçerik — kapak resmi varsa solda, içerik sağda */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {coverImage ? (
            <CoverImageLightbox
              src={`/api/dosya/${coverImage.id}`}
              alt={coverImage.originalName}
              externalUrl={post.externalUrl}
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug">{post.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.body}</p>

            {post.assessment ? (
              <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  Değerlendirme/Yorum
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

            {extraImages.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {extraImages.map((a) => (
                  <CoverImageLightbox
                    key={a.id}
                    src={`/api/dosya/${a.id}`}
                    alt={a.originalName}
                    size="thumb"
                  />
                ))}
              </div>
            ) : null}

            {fileAttachments.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {fileAttachments.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/api/dosya/${a.id}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {a.originalName}
                      <span className="text-muted-foreground">· {humanSize(a.size)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {caps.canPin || caps.canRemove || caps.canEdit ? (
          <div className="mt-3 flex items-center justify-end gap-1 border-t pt-3">
            {caps.canEdit ? (
              <EditBoardPostDialog
                post={{
                  id: post.id,
                  scope: post.scope,
                  kind: post.kind,
                  title: post.title,
                  body: post.body,
                  assessment: post.assessment ?? null,
                  tags: post.tags,
                  externalUrl: post.externalUrl,
                  publishedAt: post.publishedAt,
                  attachments: post.attachments.map((a) => ({
                    id: a.id,
                    originalName: a.originalName,
                  })),
                }}
              />
            ) : null}
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
      </CardContent>
    </Card>
  );
}
