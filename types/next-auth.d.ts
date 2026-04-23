import type { GroupCode, Role, UserStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Auth.js v5 surfaces its types via `@auth/core`; `next-auth` re-exports but
 * module augmentation targets must point at the canonical declaration file.
 */

declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
      status: UserStatus;
      roles: Role[];
      groupId: string | null;
      groupCode: GroupCode | null;
    } & DefaultSession["user"];
  }

  interface User {
    status?: UserStatus;
    roles?: Role[];
    groupId?: string | null;
    groupCode?: GroupCode | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
    status?: UserStatus;
    roles?: Role[];
    groupId?: string | null;
    groupCode?: GroupCode | null;
    lastSync?: number;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      status: UserStatus;
      roles: Role[];
      groupId: string | null;
      groupCode: GroupCode | null;
    } & DefaultSession["user"];
  }

  interface User {
    status?: UserStatus;
    roles?: Role[];
    groupId?: string | null;
    groupCode?: GroupCode | null;
  }
}
