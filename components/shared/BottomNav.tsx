/* AI-CONTEXT-NOTE:{"R":"Fixed bottom navigation (Home/Transactions/Settings) with active-state highlighting based on the current pathname.","IDD":[{"?":"Fixed positioning means page shells add pb-20 so content clears the nav"},{"?":"lucide icons; active link uses text-primary, inactive uses text-muted-foreground"}],"A":[{"!!!":"Every page shell (DashboardView, TransactionsView, SettingsView)","CRITICAL":"all three render BottomNav and rely on its fixed height"}],"AB":[{"?":"app route paths (/, /transactions, /settings)","adding a route changes this"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify active highlighting and that pb-20 shells still clear the nav"}]} */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, ChartPie } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/settings", label: "Settings", icon: ChartPie },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}