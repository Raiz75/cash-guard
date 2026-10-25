/* AI-CONTEXT-NOTE:{"R":"Shared Supabase-backed domain types: TransactionType, Category, Transaction (with derived category display name), and Budget — used by the repository and TanStack Query layer.","IDD":[{"?":"Mirrors the public.categories/transactions/budgets schema: ids are UUID strings, amounts numbers, timestamptz as epoch ms, date as YYYY-MM-DD"},{"?":"Transaction carries both categoryId (FK) and a derived category display name from categories(name)"},{"?":"Budget is per-category (categoryId) with createdAt/updatedAt epoch ms"}],"A":[{"!!":"lib/supabase/client.ts","note":"queries map rows to these types"},{"!!":"lib/query/client.ts","note":"query keys for these entities"},{"?":"lib/db/repository.ts","note":"data-access layer uses these types"}],"AB":[{"?":"supabase/migrations/20261024000000_init.sql","note":"column shapes must match these types"}],"E":[{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Types must stay in sync with the migration SQL columns"}]} */
export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  category: string; // derived display name from categories(name)
  description: string | null;
  date: string;
  createdAt: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}
