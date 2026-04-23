import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 space-y-2", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link
            href="/panel"
            className="inline-flex items-center gap-1 hover:text-foreground"
            aria-label="Ana Panel"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.map((c, i) => (
            <React.Fragment key={`${c.label}-${i}`}>
              <ChevronRight className="h-3 w-3" />
              {c.href ? (
                <Link href={c.href} className="hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className="text-foreground">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-[26px]">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
