/* AI-CONTEXT-NOTE:{"R":"Budget route (/budget) — renders BudgetView with page metadata.","IDD":[{"?":"force-dynamic because all content is client-side data from IndexedDB"}],"A":[{"?":"components/budget/BudgetView.tsx","rendered here"}],"AB":[{"?":"components/budget/BudgetView.tsx","prop/behavior changes reflected here"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Keep force-dynamic and the metadata title"}]} */

import type { Metadata } from "next";
import { BudgetView } from "@/components/budget/BudgetView";

export const metadata: Metadata = { title: "Budget · Cash Guard" };
export const dynamic = "force-dynamic";

export default function BudgetPage() {
  return <BudgetView />;
}
