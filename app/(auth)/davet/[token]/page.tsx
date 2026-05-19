import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { ROLE_LABELS } from "@/lib/constants";
import { groupBadgeClass } from "@/lib/group-badge";
import { AcceptInviteForm } from "@/features/invites/accept-form";

export const metadata = { title: "Davet kabul" };
export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function AcceptInvitePage({ params }: { params: Params }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  const groups = await prisma.group.findMany({
    select: { id: true, code: true, description: true },
  });
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const inviteGroup = invite?.groupId ? groupMap.get(invite.groupId) : null;
  const groupCode = inviteGroup?.code ?? null;
  const groupDescription = inviteGroup?.description ?? null;

  if (!invite) notFound();

  const expired = invite.expiresAt.getTime() < Date.now();
  const invalid = invite.status !== "PENDING" || expired;

  return (
    <Card className="border-border/60 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Üyelik davetiniz</CardTitle>
        <CardDescription>
          {invalid
            ? "Bu davet bağlantısı artık geçerli değil."
            : "Bilgilerinizi tamamlayın — onay gerekmez, hemen aktif olursunuz."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!invalid ? (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
              <span className="text-sm font-medium">{invite.email}</span>
              {groupCode ? (
                <Badge variant="outline" className={groupBadgeClass(groupCode, "text-[10px]")}>
                  {groupCode}
                  {groupDescription ? ` · ${groupDescription}` : ""}
                </Badge>
              ) : null}
              {(invite.roles.length > 0 ? invite.roles : (["USER"] as const)).map((r) => (
                <Badge key={r} variant="secondary">
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
            </div>

            <AcceptInviteForm token={token} email={invite.email} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Yönetici ile iletişime geçerek yeni davet isteyebilirsiniz.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
