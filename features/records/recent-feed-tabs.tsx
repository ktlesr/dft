"use client";

import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/empty-state";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ACTIVE_RECORD_TYPES, RECORD_LABELS, type ActiveRecordTypeSlug } from "./types";
import type { PublicRecordItem } from "./recent-public";

const TAB_TITLES: Record<ActiveRecordTypeSlug, string> = {
  "proje-fikri": "Proje Fikirleri",
  "proje-basvurusu": "Proje Başvuruları",
  "basarili-proje": "Başarılı Projeler",
  etkinlik: "Etkinlikler",
  "dokuman-icerik": "Dijital İçerikler",
  paydas: "Paydaşlar",
};

type RecentFeedTabsProps = {
  /** Type → latest items map, fetched server-side. */
  feeds: Record<ActiveRecordTypeSlug, PublicRecordItem[]>;
};

export function RecentFeedTabs({ feeds }: RecentFeedTabsProps) {
  return (
    <Tabs defaultValue="proje-fikri" className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
        {ACTIVE_RECORD_TYPES.map((t) => (
          <TabsTrigger key={t} value={t} className="text-xs sm:text-sm">
            {TAB_TITLES[t]}
          </TabsTrigger>
        ))}
      </TabsList>

      {ACTIVE_RECORD_TYPES.map((t) => {
        const items = feeds[t] ?? [];
        return (
          <TabsContent key={t} value={t}>
            {items.length === 0 ? (
              <EmptyState
                title={`Henüz ${RECORD_LABELS[t]} paylaşımı yok`}
                description="Yeni bir kayıt eklendiğinde burada görünecek."
                className="border-0 py-8"
              />
            ) : (
              <ul className="divide-y">
                {items.map((it) => (
                  <li key={`${it.type}:${it.id}`} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/kayitlarim/${it.type}/${it.id}`}
                          className="block truncate text-sm font-medium hover:text-primary"
                        >
                          {it.title}
                        </Link>
                        {it.subtitle ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {it.subtitle}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {it.authorName ?? "—"}
                          {it.groupCode ? ` · ${it.groupCode}` : ""} ·{" "}
                          {formatDateTime(it.publishedAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {RECORD_LABELS[t]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
