/* AI-CONTEXT-NOTE:{"R":"Sticky top bar with title/subtitle and a hydrated theme toggle (dark/light).","IDD":[{"?":"UseHydrated() gates the icon render to avoid hydration mismatch for the resolvedTheme-dependent toggle"},{"?":"lucide Moon/Sun icons with semantic tokens (bg-background/80 backdrop-blur) per theme"}],"A":[{"!!!":"components/dashboard/DashboardView.tsx, components/transactions/TransactionsView.tsx, components/budget/BudgetView.tsx, components/settings/SettingsView.tsx","CRITICAL":"all four pages render Header"}],"AB":[{"?":"lib/hooks/useHydrated.ts","hydration gating"},{"?":"next-themes","resolvedTheme/setTheme"},{"?":"components/ui/button.tsx","variant=ghost size=icon"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify no hydration mismatch and the toggle flips correctly"},{"*":"title/subtitle props must stay optional-safe for SettingsView (subtitle omitted)"}]} */

"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useHydrated } from "@/lib/hooks/useHydrated";
import { Button } from "@/components/ui/button";

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const dark = hydrated && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
      <div>
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
        {hydrated && subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle theme"
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        {hydrated ? (
          dark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )
        ) : (
          <span className="h-5 w-5" />
        )}
      </Button>
    </header>
  );
}