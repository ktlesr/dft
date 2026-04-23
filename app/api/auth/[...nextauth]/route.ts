import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// Auth routes must be dynamic — they read cookies & headers.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
