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

function toColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h < 0 ? h + 360 : h} 60% 45%)`;
}

export async function seedIfEmpty(): Promise<void> {
  const defaults: Omit<Category, "id">[] = [
    { name: "Salary", type: "income", icon: "tag", color: "#2dd4bf" },
    { name: "Freelance", type: "income", icon: "tag", color: "#38bdf8" },
    { name: "Food", type: "expense", icon: "tag", color: "#fb7185" },
    { name: "Transport", type: "expense", icon: "tag", color: "#fbbf24" },
    { name: "Shopping", type: "expense", icon: "tag", color: "#a78bfa" },
    { name: "Bills", type: "expense", icon: "tag", color: "#22d3ee" },
    { name: "Entertainment", type: "expense", icon: "tag", color: "#f472b6" },
    { name: "Other", type: "expense", icon: "tag", color: toColor("Other") },
  ];

  await db.transaction("rw", db.categories, async () => {
    const existing = await db.categories.toArray();

    const seen = new Set<string>();
    const keep = new Set<string>();
    for (const cat of existing) {
      const key = `${cat.type}:${cat.name.toLowerCase()}`;
      if (seen.has(key)) {
        await db.categories.delete(cat.id);
      } else {
        seen.add(key);
        keep.add(key);
      }
    }

    const keysToAdd = defaults.filter(
      (d) => !keep.has(`${d.type}:${d.name.toLowerCase()}`)
    );
    if (keysToAdd.length > 0) {
      await db.categories.bulkPut(keysToAdd.map((c) => ({ id: newId(), ...c })));
    }

    await db.categories.toCollection().modify({ icon: "tag" });
  });
}