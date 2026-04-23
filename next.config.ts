import type { NextConfig } from "next";

/**
 * Security headers are emitted by `proxy.ts` (was `middleware.ts` pre-Next-16)
 * instead of here so we can mint a per-request CSP nonce. Keep this file
 * focused on build + runtime behaviour.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // `standalone` is opt-in via env so local Windows developers (where
  // pnpm symlinks require Developer Mode) still get normal builds.
  // The Dockerfile sets BUILD_STANDALONE=true for production images.
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" as const } : {}),
  experimental: {
    serverActions: { bodySizeLimit: "15mb" },
  },
};

export default nextConfig;
