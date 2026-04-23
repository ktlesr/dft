import Link from "next/link";
import { Construction } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PhasePlaceholder({
  phase,
  title,
  description,
  backHref = "/panel",
  backLabel = "Ana panele dön",
  className,
}: {
  phase: "Faz 2" | "Faz 3" | "Faz 4" | "Faz 5";
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Construction className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{phase}</p>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
