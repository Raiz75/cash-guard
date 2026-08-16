/* AI-CONTEXT-NOTE:{"R":"Transactions route (/transactions) - renders TransactionsView with metadata.","IDD":[{"?":"force-dynamic client view; the ?add=1 query param is consumed by TransactionsView."}],"A":[{"?":"components/transactions/TransactionsView.tsx","rendered here"}],"AB":[{"?":"components/transactions/TransactionsView.tsx","behavior changes are reflected here"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Keep force-dynamic and the metadata title"}]} */

import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/TransactionsView";

export const metadata: Metadata = { title: "Transactions · Cash Guard" };
export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  return <TransactionsView />;
}