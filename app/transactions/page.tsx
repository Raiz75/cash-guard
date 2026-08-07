import type { Metadata } from "next";
import { TransactionsView } from "@/components/transactions/TransactionsView";

export const metadata: Metadata = { title: "Transactions · Cash Guard" };
export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  return <TransactionsView />;
}