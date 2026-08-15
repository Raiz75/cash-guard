/**
 * FILE NAME: TransactionsView.tsx
 *
 * ROLE: Transactions page orchestrator — filter state, list, add/edit/delete dialogs, and the ?add=1 deep-link handling.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - add/edit/deleting are controlled by component state; ?add=1 in the URL opens the add dialog and closing it router.push("/transactions").
 * ? - dialogKey + editing.id drive React keys so each dialog instance resets cleanly.
 * ? - Filtering is memoized via applyFilters (from TransactionFilters).
 *
 * AFFECTS:
 * ! - app/transactions/page.tsx (CRITICAL: rendered by the route)
 * ? - components/transactions/TransactionFilters.tsx (consumes Filters / applyFilters)
 *
 * AFFECTED BY:
 * ? - lib/hooks/useTransactions.ts (useTransactions)
 * ? - lib/db/schema.ts (Transaction type)
 * ? - lib/validations/transaction.ts (TransactionInput for edit prefill)
 * ? - components/transactions/TransactionFilters.tsx (Filters shape changes break this)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Verify add (?add=1), edit, delete flows and the "N shown" subtitle
 * * - URL param must not leave a stale ?add=1 in the address bar after closing
 *
 * AI INSTRUCTIONS
 * - When editing this file, ALWAYS check the AFFECTS list first
 * - After changes, run ALL tests listed under ON FILE EDIT
 * - If AFFECTED BY files change, verify this file still works
 * - KEEP THIS HEADER CURRENT: whenever you edit this file, update ROLE, decisions, AFFECTS, AFFECTED BY, and ON FILE EDIT to match the change
 * - Keep every entry on one line (no wrapped continuations) so Better Comments highlights the full line
 * - Red (!) items are CRITICAL and cannot be skipped
 * - Blue (?) items are important but not blocking
 * - Green (*) items are nice-to-have; skip if not applicable
 */

"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useTransactions } from "@/lib/hooks/useTransactions";
import type { Transaction } from "@/lib/db/schema";
import type { TransactionInput } from "@/lib/validations/transaction";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TransactionFilters,
  applyFilters,
  type Filters,
} from "@/components/transactions/TransactionFilters";
import { TransactionList } from "@/components/transactions/TransactionList";
import { TransactionDialog } from "@/components/transactions/TransactionDialog";
import { DeleteTransactionDialog } from "@/components/transactions/DeleteTransactionDialog";

export function TransactionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allTransactions = useTransactions();

  const [filters, setFilters] = useState<Filters>({
    type: "all",
    category: "all",
    search: "",
    range: "all",
  });

  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<{ id: string; initial: TransactionInput } | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const addOpen = searchParams.get("add") === "1";

  const transactions = useMemo(() => allTransactions ?? [], [allTransactions]);

  const filtered = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters]
  );

  const openAdd = () => {
    setDialogKey((k) => k + 1);
    router.push("/transactions?add=1");
  };

  const openEdit = (tx: Transaction) => {
    setDialogKey((k) => k + 1);
    setEditing({
      id: tx.id,
      initial: {
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description ?? "",
        date: tx.date,
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-20">
      <Header title="Transactions" subtitle={`${filtered.length} shown`} />

      <main className="flex-1 space-y-4 px-4 pt-4">
        <Button className="w-full gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add transaction
        </Button>

        <TransactionFilters filters={filters} onChange={setFilters} />

        <Card>
          <CardContent className="pt-2">
            <TransactionList
              transactions={filtered}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      <TransactionDialog
        key={`add-${dialogKey}`}
        open={addOpen}
        onOpenChange={(o) => {
          if (!o) router.push("/transactions");
        }}
        title="Add transaction"
      />

      <TransactionDialog
        key={`edit-${dialogKey}-${editing?.id ?? "new"}`}
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title="Edit transaction"
        id={editing?.id}
        initial={editing?.initial}
      />

      <DeleteTransactionDialog
        tx={deleting}
        open={Boolean(deleting)}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
      />
    </div>
  );
}