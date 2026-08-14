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