/* AI-CONTEXT-NOTE:{"R":"Defines the Dexie database (three tables: transactions, categories, budgets; indexes; versions 1–2) and the canonical Transaction/Category/Budget/TransactionType types plus the newId() helper and the namespaced category-budget row id helpers (CATEGORY_BUDGET_PREFIX 'cat:' with categoryBudgetId/parseCategoryBudgetId).","IDD":[{"?":"Local-first: all app data lives in IndexedDB via Dexie; single source of truth for the schema every other module depends on"},{"?":"Transactions and categories are separate tables; category name (not id) is the join key used by transactions, so renaming must cascade (see repository.ts)"},{"?":"Category.icon stores a Tabler icon name string (nullable); colors are CSS color strings resolved at render time"},{"?":"IDs are UUIDs via newId(); createdAt is a Date.now() epoch number"},{"?":"version(1) is kept untouched and version(2) re-declares both old stores plus the new budgets table so old installs upgrade losslessly"},{"?":"Budget is now defined solely by per-category breakdowns; total budget = sum of category breakdowns"}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"table definitions, types, and newId are its foundation — changing a column or index breaks every write operation"},{"!!":"lib/db/repository.ts category-budget ops","categoryBudgetId/parseCategoryBudgetId/CATEGORY_BUDGET_PREFIX key every cat:<id> budgets row (set/get/delete guards and deleteCategory cascade)"},{"!!!":"lib/hooks/useTransactions.ts","CRITICAL":"queries db.transactions/db.categories and exposes Transaction/Category types to the UI"},{"!":"Budget views/components (Tasks 4+ of the budget-and-pagination plan)","consume Budget/OVERALL_BUDGET_ID via repository getBudget/setBudget"},{"?":"lib/csv.ts","CsvRow shape must stay parseable into Transaction"},{"?":"lib/validations/transaction.ts","inferred input types must match these records"},{"?":"Every view/component importing Transaction/Category types","type dependencies"}],"AB":[{"?":"Dexie and uuid package versions","upgrades can change index/type behavior"}],"E":[{"!!":"npm run build","type errors surface anywhere the types are used"},{"!!":"npm run lint"},{"!!":"npm test -- tests/repository.test.ts after touching schema or budget operations"},{"?":"Bump/verify Dexie version(...) when adding columns, or old installs lose data"},{"?":"Verify index fields match the queries in useTransactions.ts"},{"?":"Confirm v1→v2 migration adds only the empty budgets table (old installs upgrade losslessly)"},{"?":"categoryBudgetId/parseCategoryBudgetId must round-trip and parse non-'cat:' ids (e.g. 'overall') to null — changing the prefix orphans existing rows"},{"*":"Adding a required field breaks CSV import, forms, and repository writes — check all"}]} */

import Dexie, { type Table } from "dexie";
import { v4 as uuidv4 } from "uuid";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Budget {
  id: string;
  amount: number;
  createdAt: number;
  updatedAt: number;
}

export const CATEGORY_BUDGET_PREFIX = "cat:";

export function categoryBudgetId(categoryId: string): string {
  return `${CATEGORY_BUDGET_PREFIX}${categoryId}`;
}

export function parseCategoryBudgetId(id: string): string | null {
  return id.startsWith(CATEGORY_BUDGET_PREFIX)
    ? id.slice(CATEGORY_BUDGET_PREFIX.length)
    : null;
}

class DB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  budgets!: Table<Budget, string>;

  constructor() {
    super("cash-guard");
    this.version(1).stores({
      transactions: "id, type, category, date, createdAt",
      categories: "id, type, name",
    });
    this.version(2).stores({
      transactions: "id, type, category, date, createdAt",
      categories: "id, type, name",
      budgets: "id",
    });
  }
}

export const db = new DB();

export function newId(): string {
  return uuidv4();
}