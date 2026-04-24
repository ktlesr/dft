import "server-only";

import NextAuth, { CredentialsSignin } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import type { Role, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

/**
 * Shape of the custom claims we store on the JWT. Auth.js v5 beta re-exports
 * its public types as aliases (not interfaces), which makes cross-package
 * module augmentation unreliable. We define a local claim shape and cast at
 * the callback boundary — behavior is identical, types stay accurate.
 */
type DFTClaims = {
  uid?: string;
  status?: UserStatus;
  roles?: Role[];
  groupId?: string | null;
  groupCode?: string | null;
  lastSync?: number;
};

type DFTAuthorized = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  status: UserStatus;
  roles: Role[];
  groupId: string | null;
  groupCode: string | null;
};

/**
 * Fail codes surfaced through `CredentialsSignin`. Kept narrow so we do not
 * enable user enumeration — login pages always show a generic message.
 */
export class InvalidCredentials extends CredentialsSignin {
  override code = "invalid_credentials";
}
export class AccountLocked extends CredentialsSignin {
  override code = "locked";
}

const ACCOUNT_LOCK_THRESHOLD = 8;
const ACCOUNT_LOCK_MINUTES = 15;
const TOKEN_REFRESH_MS = 5 * 60 * 1000;

const loginInput = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h sliding session
  trustHost: true,
  pages: {
    signIn: "/giris",
    error: "/giris",
  },
  // The `__Secure-` prefix requires the Secure flag, which in turn requires
  // HTTPS. We only add the prefix in production to keep dev (HTTP) usable.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-dft-portal.session"
          : "dft-portal.session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    // DFT Portal is a closed system — access is issued by admins.
    // Credentials is the only provider; Google OAuth was removed to
    // keep signup off the public surface entirely.
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginInput.safeParse(raw);
        if (!parsed.success) throw new InvalidCredentials();
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { roles: true, group: true },
        });
        if (!user || !user.passwordHash) throw new InvalidCredentials();

        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          throw new AccountLocked();
        }

        const ok = await verifyPassword(user.passwordHash, password);
        if (!ok) {
          const nextCount = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: nextCount,
              lockedUntil:
                nextCount >= ACCOUNT_LOCK_THRESHOLD
                  ? new Date(Date.now() + ACCOUNT_LOCK_MINUTES * 60_000)
                  : user.lockedUntil,
            },
          });
          throw new InvalidCredentials();
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        // We return even PENDING/SUSPENDED users here — the portal layout
        // routes them to /onay-bekleniyor or /yetkisiz based on status.
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          status: user.status,
          roles: user.roles.map((r) => r.role),
          groupId: user.groupId,
          groupCode: user.group?.code ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      const t = token as typeof token & DFTClaims;

      // Initial sign-in: seed token from authorize() / adapter user.
      if (user && "id" in user && user.id) {
        const u = user as typeof user & Partial<DFTAuthorized>;
        t.uid = u.id as string;
        if (u.status) t.status = u.status;
        t.roles = u.roles ?? [];
        t.groupId = u.groupId ?? null;
        t.groupCode = u.groupCode ?? null;
        t.lastSync = Date.now();
        return t;
      }

      // Periodic resync so status / role / group changes from the admin
      // panel propagate without requiring a re-login.
      const uid = t.uid;
      const lastSync = t.lastSync ?? 0;
      const shouldRefresh =
        trigger === "update" || !lastSync || Date.now() - lastSync > TOKEN_REFRESH_MS;

      if (uid && shouldRefresh) {
        const fresh = await prisma.user.findUnique({
          where: { id: uid },
          include: { roles: true, group: true },
        });
        if (fresh) {
          t.status = fresh.status;
          t.roles = fresh.roles.map((r) => r.role);
          t.groupId = fresh.groupId;
          t.groupCode = fresh.group?.code ?? null;
          t.lastSync = Date.now();
        }
      }
      return t;
    },

    async session({ session, token }) {
      const t = token as typeof token & DFTClaims;
      const s = session as typeof session & {
        user: typeof session.user & {
          id: string;
          status: UserStatus;
          roles: Role[];
          groupId: string | null;
          groupCode: string | null;
        };
      };
      if (t.uid) s.user.id = t.uid;
      s.user.status = t.status ?? "PENDING_APPROVAL";
      s.user.roles = t.roles ?? [];
      s.user.groupId = t.groupId ?? null;
      s.user.groupCode = t.groupCode ?? null;
      return s;
    },
  },

  events: {
    async signOut() {
      // Audit logging of logouts lives in the explicit signOut server action;
      // this event handler fires both there and on token expiry, so we keep it quiet.
    },
  },
});
