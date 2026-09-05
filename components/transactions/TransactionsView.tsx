/* AI-CONTEXT-NOTE:{"R":"Transactions page orchestrator — filter state, paginated list (10/page), add/edit/delete dialogs, and ?add=1 deep-link handling.","IDD":[{"?":"add/edit/delete controlled by component state; ?add=1 URL opens add dialog, closing it router.push('/transactions')"},{"?":"dialogKey + editing.id drive React keys so each dialog instance resets cleanly"},{"?":"Filtering is memoized via applyFilters (from TransactionFilters)"},{"?":"PAGE_SIZE=10 pagination via lib/paginate; pager hidden when filtered.length <= PAGE_SIZE"},{"?":"Filter changes reset page to 1 through handleFiltersChange wrapper — NO useEffect"},{"?":"displayPage = Math.min(page, totalPages) clamps during render so deleting rows never blanks a page"}],"A":[{"!!!":"app/transactions/page.tsx","CRITICAL":"rendered by the route"},{"?":"components/transactions/TransactionFilters.tsx","consumes Filters / applyFilters"},{"?":"components/ui/pagination.tsx","pager primitives rendered when >10 results"}],"AB":[{"?":"lib/hooks/useTransactions.ts","useTransactions"},{"?":"lib/db/schema.ts","Transaction type"},{"?":"lib/validations/transaction.ts","TransactionInput for edit prefill"},{"?":"lib/paginate.ts","paginate(rows,page,size) contract changes break slicing/clamping"},{"?":"components/transactions/TransactionFilters.tsx","Filters shape changes break this"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"npm test -- tests/paginate.test.ts"},{"?":"Verify add (?add=1), edit, delete flows and the 'N shown' subtitle"},{"?":"Verify pager hidden at <=10 results, prev disabled on page 1, next disabled on last page, filter change resets to Page 1 of N"},{"*":"Deleting rows on the last page must clamp display, never render a blank page"},{"*":"URL param must not leave a stale ?add=1 in the address bar after closing"}]} */

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
import { paginate } from "@/lib/paginate";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

const PAGE_SIZE = 10;

export function TransactionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const allTransactions = useTransactions();

  const [filters, setFilters] = useState<Filters>({
    type: "all",
    category: "all",
    search: "",
    range: { range: "all" },
  });
  const [page, setPage] = useState(1);

  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<{ id: string; initial: TransactionInput } | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const addOpen = searchParams.get("add") === "1";

  const transactions = useMemo(() => allTransactions ?? [], [allTransactions]);

  const filtered = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters]
  );

  const { rows, totalPages } = useMemo(
    () => paginate(filtered, page, PAGE_SIZE),
    [filtered, page]
  );
  const displayPage = Math.min(page, totalPages);

  const handleFiltersChange = (next: Filters) => {
    setFilters(next);
    setPage(1);
  };

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

        <TransactionFilters filters={filters} onChange={handleFiltersChange} />

        <Card>
          <CardContent className="pt-2">
            <TransactionList
              transactions={rows}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
          </CardContent>
        </Card>

        {filtered.length > PAGE_SIZE && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  disabled={displayPage <= 1}
                  onClick={() => setPage(displayPage - 1)}
                />
              </PaginationItem>
              <PaginationItem className="text-sm text-muted-foreground">
                Page {displayPage} of {totalPages}
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  disabled={displayPage >= totalPages}
                  onClick={() => setPage(displayPage + 1)}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
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