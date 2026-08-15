/**
 * FILE NAME: page.tsx (app/transactions)
 *
 * ROLE: Transactions route ("/transactions") — renders TransactionsView with metadata.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - force-dynamic client view; the ?add=1 query param is consumed by TransactionsView.
 *
 * AFFECTS:
 * ? - components/transactions/TransactionsView.tsx (rendered here)
 *
 * AFFECTED BY:
 * ? - components/transactions/TransactionsView.tsx
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Keep force-dynamic and the metadata title
 */

import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/TransactionsView";

export const metadata: Metadata = { title: "Transactions · Cash Guard" };
export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  return <TransactionsView />;
}