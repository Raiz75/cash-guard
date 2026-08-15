/**
 * FILE NAME: theme-provider.tsx
 *
 * ROLE: Thin wrapper around next-themes ThemeProvider configuring class-based dark mode
 * with system default, used by the root layout.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - attribute="class" matches globals.css `.dark` selector; enableSystem follows the OS.
 * ? - Kept as a separate module so layout.tsx stays declarative and theme config is centralized.
 *
 * AFFECTS:
 * ! - app/layout.tsx (CRITICAL: wraps the whole app — breaking it breaks theming)
 *
 * AFFECTED BY:
 * ? - next-themes version
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify class toggling + system preference still work, no hydration mismatch
 */

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}