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