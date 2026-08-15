/**
 * FILE NAME: layout.tsx
 *
 * ROLE: Root layout — loads fonts, sets metadata/viewport/manifest, and wraps every
 * route in the ThemeProvider and Toaster.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - Fonts (Roboto/Inter/Geist) are loaded via next/font and exposed as CSS variables
 *     consumed by globals.css.
 * ? - suppressHydrationWarning is required on <html> because next-themes swaps classes.
 * ? - app is client-driven (force-dynamic pages); this layout is the server shell.
 *
 * AFFECTS:
 * ! - Every route: app/page.tsx, app/transactions/page.tsx, app/settings/page.tsx
 *     (CRITICAL: removing ThemeProvider or Toaster breaks theming/toasts app-wide)
 * ? - app/globals.css (font variables --font-sans / --font-geist-mono / --font-heading)
 *
 * AFFECTED BY:
 * ? - components/theme-provider.tsx (theme behavior)
 * ? - components/ui/sonner.tsx (Toaster)
 * ? - lib/utils.ts (cn for the <html> className)
 * ? - next.config.ts / tsconfig.json (next/font resolution, path alias)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify manifest, appleWebApp, and viewport (themeColor) still set
 * ? - Verify no hydration mismatch warnings (suppressHydrationWarning stays)
 */

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter, Roboto } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { cn } from "@/lib/utils";

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cash Guard",
  description: "Track your income and expenses",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cash Guard",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable, robotoHeading.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
