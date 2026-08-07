import { db, newId, type Transaction, type Category } from "./schema";
import type { TransactionInput, CategoryInput } from "@/lib/validations/transaction";

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
  await db.categories.update(id, { name: input.name.trim(), type: input.type });
}

export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

export async function exportData(): Promise<{ transactions: Transaction[]; categories: Category[] }> {
  const transactions = await db.transactions.toArray();
  const categories = await db.categories.toArray();
  return { transactions, categories };
}