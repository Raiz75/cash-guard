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