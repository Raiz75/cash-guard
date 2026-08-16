/* AI-CONTEXT-NOTE:{"R":"Thin wrapper around next-themes ThemeProvider configuring class-based dark mode with system default, used by the root layout.","IDD":[{"?":"attribute=\"class\" matches globals.css .dark selector; enableSystem follows the OS."},{"?":"Kept as a separate module so layout.tsx stays declarative and theme config is centralized."}],"A":[{"!!!":"app/layout.tsx","CRITICAL":"Wraps the whole app - breaking it breaks theming"}],"AB":[{"?":"next-themes version","upgrades can change provider API/behavior"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify class toggling + system preference still work, no hydration mismatch"}]} */

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