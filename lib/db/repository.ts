/* AI-CONTEXT-NOTE:{"R":"The only module that writes to IndexedDB — CRUD for transactions and categories, overall-budget get/set with an allocation guard against category budgets, namespaced cat:<id> category-budget rows (get/set/delete), per-category current-month spend, total monthly spend, CSV import (with dedupe), export, and category reassignment with breakdown-row cascade.","IDD":[{"?":"All writes go through here so live queries in useTransactions.ts never perform rw transactions (a write inside a useLiveQuery callback throws ReadonlyError)"},{"?":"updateCategory/importTransactions use one rw transaction so rename-cascade and batch import are atomic"},{"?":"Transactions reference categories by name, so rename cascades via db.transactions.where(category).equals(old).modify(...)"},{"?":"Changing a category's type while it has transactions is rejected explicitly"},{"?":"The overall budget is a singleton row keyed by OVERALL_BUDGET_ID upserted in one rw transaction — createdAt is preserved across updates"},{"?":"Category budgets are namespaced rows in the EXISTING budgets table (id 'cat:<categoryId>' via categoryBudgetId) — no Dexie version bump"},{"?":"setCategoryBudget excludes the edited row's own amount from the allocated total so edits never double-count against the cap; setBudget rejects lowering below the already-allocated sum"},{"?":"setBudget/setCategoryBudget re-validate amount>0 inside the rw transaction ('Amount must be greater than 0') so non-positive amounts are rejected even when callers bypass Zod"},{"?":"deleteCategory runs one rw transaction across transactions/categories/budgets so the breakdown row is removed atomically with the category"},{"?":"getMonthlySpent range-scans the date index via monthRange() then filters expenses client-side; getMonthlySpentByCategory keys the same scan by category name"}],"A":[{"!!!":"components/transactions/TransactionForm.tsx","CRITICAL":"addTransaction/updateTransaction"},{"!!!":"components/settings/SettingsView.tsx","CRITICAL":"addCategory, exportData, importTransactions, transactionCountForCategory"},{"!":"Budget view components (Task 4+ of the budget-and-pagination plan)","consume getBudget/setBudget/getMonthlySpent"},{"!!":"Dashboard + budget views (Tasks 4–6 of the dashboard-pie-and-category-breakdowns plan)","consume getCategoryBudgets/setCategoryBudget/deleteCategoryBudget/getMonthlySpentByCategory and the setBudget allocation guard"},{"?":"components/settings/DeleteCategoryDialog.tsx","deleteCategory, reassignCategory"},{"?":"components/settings/CategoryEditDialog.tsx","updateCategory"},{"?":"components/transactions/DeleteTransactionDialog.tsx","deleteTransaction"}],"AB":[{"?":"lib/db/schema.ts","db, newId, types, OVERALL_BUDGET_ID, CATEGORY_BUDGET_PREFIX/categoryBudgetId — any schema change ripples here"},{"?":"lib/validations/transaction.ts","transactionSchema validates imported rows; inputs typed"},{"?":"lib/csv.ts","CsvRow is the import source"},{"?":"lib/format.ts","monthRange() defines the current-month window for getMonthlySpent/getMonthlySpentByCategory; formatPeso renders amounts in allocation-guard errors"}],"E":[{"!!":"npm test -- tests/repository.test.ts after any repository/schema edit"},{"!!":"npm run build"},{"!!":"npm run lint"},{"!!":"setCategoryBudget guards: rejects without overall budget ('Set a monthly budget first'), rejects over-allocation ('left unallocated'), allows exactly-equal totals, preserves createdAt on edit"},{"!!":"setBudget guard: rejects lowering below allocated total ('already allocated'), allows equal; deleteCategory removes the cat:<id> row atomically"},{"!!":"amount guards: setBudget(0|-n) and setCategoryBudget(0|-n) reject with 'Amount must be greater than 0' before other checks, leaving no partial writes"},{"?":"Re-verify import dedupe (existingIds vs batchIds), rename cascade, and type-lock logic"},{"?":"setBudget preserves createdAt and keeps exactly one 'overall' row"},{"?":"getMonthlySpent month boundaries inclusive; excludes income and other months"},{"?":"getMonthlySpentByCategory keys expenses only, by category name, current month"},{"*":"Never call a rw transaction from inside a useLiveQuery callback"},{"*":"Empty CSV / all-skipped imports must return imported=0 without partial writes"}]} */

import {
  db,
  newId,
  type Transaction,
  type Category,
  type Budget,
  OVERALL_BUDGET_ID,
  CATEGORY_BUDGET_PREFIX,
  categoryBudgetId,
} from "./schema";
import { monthRange, formatPeso } from "@/lib/format";
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
  await db.transaction(
    "rw",
    db.transactions,
    db.categories,
    db.budgets,
    async () => {
      await db.categories.delete(id);
      await db.budgets.delete(categoryBudgetId(id));
    }
  );
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
    if (!(amount > 0)) throw new Error("Amount must be greater than 0");
    const rows = await db.budgets.toArray();
    const allocated = rows
      .filter((r) => r.id.startsWith(CATEGORY_BUDGET_PREFIX))
      .reduce((sum, r) => sum + r.amount, 0);
    if (allocated > amount) {
      throw new Error(
        `Reduce category budgets first — ${formatPeso(allocated)} is already allocated`
      );
    }
    const existing = await db.budgets.get(OVERALL_BUDGET_ID);
    await db.budgets.put({
      id: OVERALL_BUDGET_ID,
      amount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  });
}

export async function getCategoryBudgets(): Promise<Budget[]> {
  const rows = await db.budgets.toArray();
  return rows.filter((r) => r.id.startsWith(CATEGORY_BUDGET_PREFIX));
}

export async function setCategoryBudget(
  categoryId: string,
  amount: number
): Promise<void> {
  const now = Date.now();
  await db.transaction("rw", db.budgets, async () => {
    if (!(amount > 0)) throw new Error("Amount must be greater than 0");
    const overall = await db.budgets.get(OVERALL_BUDGET_ID);
    if (!overall) throw new Error("Set a monthly budget first");
    const rows = await db.budgets.toArray();
    const otherTotal = rows
      .filter(
        (r) =>
          r.id.startsWith(CATEGORY_BUDGET_PREFIX) &&
          r.id !== categoryBudgetId(categoryId)
      )
      .reduce((sum, r) => sum + r.amount, 0);
    if (otherTotal + amount > overall.amount) {
      throw new Error(
        `Exceeds the monthly budget — only ${formatPeso(overall.amount - otherTotal)} left unallocated`
      );
    }
    const id = categoryBudgetId(categoryId);
    const existing = await db.budgets.get(id);
    await db.budgets.put({
      id,
      amount,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });
  });
}

export async function deleteCategoryBudget(categoryId: string): Promise<void> {
  await db.budgets.delete(categoryBudgetId(categoryId));
}

export async function getMonthlySpentByCategory(): Promise<Record<string, number>> {
  const { start, end } = monthRange();
  const rows = await db.transactions
    .where("date")
    .between(start, end, true, true)
    .toArray();
  const spent: Record<string, number> = {};
  for (const t of rows) {
    if (t.type === "expense")
      spent[t.category] = (spent[t.category] ?? 0) + t.amount;
  }
  return spent;
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