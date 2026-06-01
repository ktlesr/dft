import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Poppins } from "next/font/google";

import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Brand typography — Poppins across the whole project.
 *
 * Self-hosted by next/font at build time (served from the app origin), so it
 * satisfies the strict CSP (`font-src 'self'`) without any external request.
 * `latin-ext` carries the full Turkish glyph set (İ ı Ş ş Ğ ğ Ç ç Ö ö Ü ü).
 *
 * Poppins is a static-weight family, so the needed weights are listed
 * explicitly. The variable feeds both body text and display headings.
 */
const fontSans = Poppins({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
  variable: "--ff-sans",
});

export const metadata: Metadata = {
  title: {
    default: "DFT Projesi Portalı",
    template: "%s · DFT Projesi Portalı",
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
  applicationName: "DFT Projesi Portalı",
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
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
    <html
      lang="tr"
      className={fontSans.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider nonce={nonce}>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
