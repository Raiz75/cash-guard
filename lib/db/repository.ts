/* AI-CONTEXT-NOTE:{"R":"The only module that writes to IndexedDB — CRUD for transactions, categories, and the overall budget (get/set singleton), monthly-spend summation, plus CSV import (with dedupe), export, and category reassignment.","IDD":[{"?":"All writes go through here so live queries in useTransactions.ts never perform rw transactions (a write inside a useLiveQuery callback throws ReadonlyError)"},{"?":"updateCategory/importTransactions use one rw transaction so rename-cascade and batch import are atomic"},{"?":"Transactions reference categories by name, so rename cascades via db.transactions.where(category).equals(old).modify(...)"},{"?":"Changing a category's type while it has transactions is rejected explicitly"},{"?":"The overall budget is a singleton row keyed by OVERALL_BUDGET_ID upserted in one rw transaction — createdAt is preserved across updates"},{"?":"getMonthlySpent range-scans the date index via monthRange() then filters expenses client-side"}],"A":[{"!!!":"components/transactions/TransactionForm.tsx","CRITICAL":"addTransaction/updateTransaction"},{"!!!":"components/settings/SettingsView.tsx","CRITICAL":"addCategory, exportData, importTransactions, transactionCountForCategory"},{"!":"Budget view components (Task 4+ of the budget-and-pagination plan)","consume getBudget/setBudget/getMonthlySpent"},{"?":"components/settings/DeleteCategoryDialog.tsx","deleteCategory, reassignCategory"},{"?":"components/settings/CategoryEditDialog.tsx","updateCategory"},{"?":"components/transactions/DeleteTransactionDialog.tsx","deleteTransaction"}],"AB":[{"?":"lib/db/schema.ts","db, newId, types, OVERALL_BUDGET_ID — any schema change ripples here"},{"?":"lib/validations/transaction.ts","transactionSchema validates imported rows; inputs typed"},{"?":"lib/csv.ts","CsvRow is the import source"},{"?":"lib/format.ts","monthRange() defines the current-month window for getMonthlySpent"}],"E":[{"!!":"npm test -- tests/repository.test.ts after any repository/schema edit"},{"!!":"npm run build"},{"!!":"npm run lint"},{"?":"Re-verify import dedupe (existingIds vs batchIds), rename cascade, and type-lock logic"},{"?":"setBudget preserves createdAt and keeps exactly one 'overall' row"},{"?":"getMonthlySpent month boundaries inclusive; excludes income and other months"},{"*":"Never call a rw transaction from inside a useLiveQuery callback"},{"*":"Empty CSV / all-skipped imports must return imported=0 without partial writes"}]} */

import {
  db,
  newId,
  type Transaction,
  type Category,
  type Budget,
  OVERALL_BUDGET_ID,
} from "./schema";
import { monthRange } from "@/lib/format";
import {
  transactionSchema,
  type TransactionInput,
  type CategoryInput,
} from "@/lib/validations/transaction";
import type { CsvRow } from "@/lib/csv";

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const tx: Transaction = {
    id: newId(),
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || null,
    date: input.date,
    createdAt: Date.now(),
  };
  await db.transactions.add(tx);
  return tx;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  await db.transactions.update(id, {
    type: input.type,
    amount: input.amount,
    category: input.category,
    description: input.description?.trim() || null,
    date: input.date,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function addCategory(input: CategoryInput): Promise<Category> {
  const cat: Category = {
    id: newId(),
    name: input.name.trim(),
    type: input.type,
    icon: null,
    color: null,
  };
  await db.categories.add(cat);
  return cat;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const current = await db.categories.get(id);
  if (!current) throw new Error("Category not found");
  const name = input.name.trim();
  const typeChanged = input.type !== current.type;

  await db.transaction("rw", db.transactions, db.categories, async () => {
    if (typeChanged) {
      const count = await db.transactions.where("category").equals(current.name).count();
      if (count > 0) throw new Error("Cannot change type while the category is in use");
    }
    if (name !== current.name) {
      await db.transactions.where("category").equals(current.name).modify({ category: name });
    }
    await db.categories.update(id, { name, type: input.type });
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

export async function exportData(): Promise<{ transactions: Transaction[]; categories: Category[] }> {
  const transactions = await db.transactions.toArray();
  const categories = await db.categories.toArray();
  return { transactions, categories };
}

export async function importTransactions(
  rows: CsvRow[]
): Promise<{ imported: number; skipped: number; createdCategories: string[] }> {
  const createdCategories = new Set<string>();
  let imported = 0;
  let skipped = 0;

  await db.transaction("rw", db.transactions, db.categories, async () => {
    const existingIds = new Set((await db.transactions.toArray()).map((t) => t.id));
    const batchIds = new Set<string>();
    const categories = await db.categories.toArray();
    const storedNames = new Map(
      categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c.name])
    );

    const toAdd: Transaction[] = [];
    for (const row of rows) {
      const parsed = transactionSchema.safeParse(row);
      if (!parsed.success) {
        skipped++;
        continue;
      }
      const { id, type, amount, category, description, date } = parsed.data;
      if (id && (existingIds.has(id) || batchIds.has(id))) {
        skipped++;
        continue;
      }
      const key = `${type}:${category.toLowerCase()}`;
      let storedName = storedNames.get(key);
      if (!storedName) {
        storedName = category.trim();
        storedNames.set(key, storedName);
        createdCategories.add(storedName);
        await db.categories.add({
          id: newId(),
          name: storedName,
          type,
          icon: null,
          color: null,
        });
      }
      const newIdVal = id || newId();
      if (id) batchIds.add(id);
      toAdd.push({
        id: newIdVal,
        type,
        amount,
        category: storedName,
        description: description?.trim() || null,
        date,
        createdAt: Date.now(),
      });
    }
    if (toAdd.length > 0) {
      await db.transactions.bulkAdd(toAdd);
      imported = toAdd.length;
    }
  });

  return { imported, skipped, createdCategories: [...createdCategories] };
}

export async function transactionCountForCategory(name: string): Promise<number> {
  return db.transactions.where("category").equals(name).count();
}

export async function reassignCategory(fromName: string, toName: string): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    await db.transactions.where("category").equals(fromName).modify({ category: toName });
  });
}

export async function getBudget(): Promise<Budget | null> {
  const row = await db.budgets.get(OVERALL_BUDGET_ID);
  return row ?? null;
}

export async function setBudget(amount: number): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.budgets, async () => {
    const existing = await db.budgets.get(OVERALL_BUDGET_ID);
    await db.budgets.put({
      id: OVERALL_BUDGET_ID,
      amount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  });
}

export async function getMonthlySpent(): Promise<number> {
  const { start, end } = monthRange();
  const rows = await db.transactions
    .where("date")
    .between(start, end, true, true)
    .toArray();
  return rows
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}