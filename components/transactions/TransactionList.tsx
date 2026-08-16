/* AI-CONTEXT-NOTE:{"R":"Renders a transaction list; each row shows an income/expense indicator, amount, and ghost edit/delete icon buttons. Exports TransactionItem and TransactionList.","IDD":[{"?":"Row actions use Tabler icon buttons (IconPencil/IconTrash) with aria-labels instead of text badges"},{"?":"Income rows use text-primary (teal) and '+'; expense rows use text-destructive and '-'"}],"A":[{"?":"components/transactions/TransactionsView.tsx","renders TransactionList"}],"AB":[{"?":"lib/db/schema.ts","Transaction type"},{"?":"lib/format.ts","formatPeso, formatDisplayDate"},{"?":"lib/utils.ts","cn for row styling"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Verify aria-labels, empty state text, and +/- amount signs"},{"*":"Long descriptions must truncate without breaking layout"}]} */

"use client";

import { cn } from "@/lib/utils";
import { formatPeso, formatDisplayDate } from "@/lib/format";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
      <div className="flex shrink-0 items-center gap-1">
        <span className={`text-sm font-semibold ${income ? "text-primary" : "text-destructive"}`}>
          {income ? "+" : "-"}
          {formatPeso(tx.amount)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => onEdit(tx)}
          aria-label={`Edit ${tx.description || tx.category}`}
        >
          <IconPencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(tx)}
          aria-label={`Delete ${tx.description || tx.category}`}
        >
          <IconTrash className="h-3.5 w-3.5" />
        </Button>
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