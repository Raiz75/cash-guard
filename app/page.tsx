/* AI-CONTEXT-NOTE:{"R":"Dashboard route (/) - renders DashboardView with page metadata.","IDD":[{"?":"force-dynamic because all content is client-side data from IndexedDB."},{"?":"Renders DashboardView as the single component; ?add=1 linking is handled inside DashboardView via Link, not here."}],"A":[{"?":"components/dashboard/DashboardView.tsx","rendered here"}],"AB":[{"?":"components/dashboard/DashboardView.tsx","any prop/behavior change is reflected here"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Keep force-dynamic and the page metadata title"}]} */

import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = { title: "Home · Cash Guard" };
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <DashboardView />;
}