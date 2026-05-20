import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "DFT Projesi Portalı",
    template: "%s · DFT Portal",
  },
  description:
    "DFT üyelerine özel, kurumsal DFT Projesi Portalı. Bu portal kamuya açık değildir ve yalnızca yetkili üyeler tarafından kullanılır.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    googleBot: {
      index: false,
      follow: false,
      nocache: true,
      noimageindex: true,
    },
  },
  applicationName: "DFT Portal",
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1420" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The nonce is minted per-request by middleware and exposed on x-nonce so
  // we can pass it to libraries that inject inline scripts during hydration
  // (next-themes' FOUC-guard being the main one).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
