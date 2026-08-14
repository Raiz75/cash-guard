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