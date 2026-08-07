"use client";

import { cn } from "@/lib/utils";
import { formatPeso, formatDisplayDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/lib/db/schema";

export function TransactionItem({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}) {
  const income = tx.type === "income";
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm",
            tx.type === "income" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
          )}
        >
          {income ? "↗" : "↘"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{tx.description || tx.category}</p>
          <p className="text-xs text-muted-foreground">
            {tx.category} · {formatDisplayDate(tx.date)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`text-sm font-semibold ${income ? "text-primary" : "text-destructive"}`}>
          {income ? "+" : "-"}
          {formatPeso(tx.amount)}
        </span>
        <Badge
          variant="outline"
          className="cursor-pointer text-xs"
          onClick={() => onEdit(tx)}
        >
          Edit
        </Badge>
        <Badge variant="destructive" className="cursor-pointer text-xs" onClick={() => onDelete(tx)}>
          Del
        </Badge>
      </div>
    </div>
  );
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  emptyText = "No transactions yet.",
}: {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  emptyText?: string;
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
    );
  }

  return (
    <div className="divide-y">
      {transactions.map((tx) => (
        <TransactionItem key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}