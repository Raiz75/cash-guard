/**
 * FILE NAME: repository.ts
 *
 * ROLE: The only module that writes to IndexedDB — CRUD for transactions and categories, plus CSV import (with dedupe), export, and category reassignment.
 *
 * IMPORTANT DEVELOPER DECISIONS ON THIS FILE:
 * ? - All writes go through here so live queries in useTransactions.ts never perform rw transactions (a write inside a useLiveQuery callback throws ReadonlyError).
 * ? - updateCategory / importTransactions use one rw transaction so rename-cascade and batch import are atomic.
 * ? - Transactions reference categories by name, so rename cascades via db.transactions.where("category").equals(old).modify(...).
 * ? - Changing a category's type while it has transactions is rejected explicitly.
 *
 * AFFECTS:
 * ! - components/transactions/TransactionForm.tsx (CRITICAL: addTransaction / updateTransaction)
 * ! - components/settings/SettingsView.tsx (CRITICAL: addCategory, exportData, importTransactions, transactionCountForCategory)
 * ? - components/settings/DeleteCategoryDialog.tsx (deleteCategory, reassignCategory)
 * ? - components/settings/CategoryEditDialog.tsx (updateCategory)
 * ? - components/transactions/DeleteTransactionDialog.tsx (deleteTransaction)
 *
 * AFFECTED BY:
 * ? - lib/db/schema.ts (db, newId, types — any schema change ripples here)
 * ? - lib/validations/transaction.ts (transactionSchema validates imported rows; inputs typed)
 * ? - lib/csv.ts (CsvRow is the import source)
 *
 * ON FILE EDIT:
 * ! - npm run build
 * ! - npm run lint
 * ? - Re-verify import dedupe (existingIds vs batchIds), rename cascade, and type-lock logic
 * * - Never call a rw transaction from inside a useLiveQuery callback
 * * - Empty CSV / all-skipped imports must return imported=0 without partial writes
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

import { db, newId, type Transaction, type Category } from "./schema";
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