/* AI-CONTEXT-NOTE:{"R":"Defines the Dexie database (tables, indexes, version) and the canonical Transaction/Category/TransactionType types plus the newId() helper.","IDD":[{"?":"Local-first: all app data lives in IndexedDB via Dexie; single source of truth for the schema every other module depends on"},{"?":"Transactions and categories are separate tables; category name (not id) is the join key used by transactions, so renaming must cascade (see repository.ts)"},{"?":"Category.icon stores a Tabler icon name string (nullable); colors are CSS color strings resolved at render time"},{"?":"IDs are UUIDs via newId(); createdAt is a Date.now() epoch number"}],"A":[{"!!!":"lib/db/repository.ts","CRITICAL":"table definitions, types, and newId are its foundation — changing a column or index breaks every write operation"},{"!!!":"lib/hooks/useTransactions.ts","CRITICAL":"queries db.transactions/db.categories and exposes Transaction/Category types to the UI"},{"?":"lib/csv.ts","CsvRow shape must stay parseable into Transaction"},{"?":"lib/validations/transaction.ts","inferred input types must match these records"},{"?":"Every view/component importing Transaction/Category types","type dependencies"}],"AB":[{"?":"Dexie and uuid package versions","upgrades can change index/type behavior"}],"E":[{"!!":"npm run build","type errors surface anywhere the types are used"},{"!!":"npm run lint"},{"?":"Bump/verify Dexie version(...) when adding columns, or old installs lose data"},{"?":"Verify index fields match the queries in useTransactions.ts"},{"*":"Adding a required field breaks CSV import, forms, and repository writes — check all"}]} */

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

class DB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;

  constructor() {
    super("cash-guard");
    this.version(1).stores({
      transactions: "id, type, category, date, createdAt",
      categories: "id, type, name",
    });
  }
}

export const db = new DB();

export function newId(): string {
  return uuidv4();
}