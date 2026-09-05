/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/db/repository.ts — CRUD, category rename cascade, type-lock, CSV import dedupe/atomicity, overall-budget get/set with allocation guards, namespaced cat:<id> budget rows, deleteCategory cascade, and monthly-spend summation (total and per-category). Uses an in-memory mock of the Dexie `db` (via vi.mock of schema.ts) so no IndexedDB is needed.","IDD":[{"?":"db.transaction('rw', ...) mock invokes the callback so rw logic inside importTransactions/updateCategory runs"},{"?":"Mock tables track in-memory state and expose where().equals().count()/modify(), between().toArray(), and put() (upsert) for cascade/range/budget tests"},{"?":"newId and types are kept real via importOriginal; only `db` is replaced"},{"?":"Repository is the sole write path — tests assert it never mutates state on skipped imports"},{"?":"getMonthlySpent tests pin time via vi.useFakeTimers/setSystemTime so monthRange() is deterministic"}],"A":[{"!!!":"lib/db/repository.ts","exercised by these tests","CRITICAL":"type-lock / rename cascade must not regress"},{"!":"lib/validations/transaction.ts","rows are safeParse'd by importTransactions"},{"?":"lib/csv.ts","CsvRow is the import shape"},{"?":"lib/db/schema.ts","OVERALL_BUDGET_ID and Budget shape asserted via setBudget/getBudget tests"}],"AB":[{"?":"dexie version","any API change to Table.where chaining would need mock updates"},{"?":"vitest fake timers","system-time mocking behavior affects getMonthlySpent cases"},{"?":"lib/format.ts","monthRange() pins the current-month window asserted by getMonthlySpentByCategory"}],"E":[{"!!":"npm test -- tests/repository.test.ts"},{"!!":"setCategoryBudget guards: rejects without overall budget, rejects over-allocation, allows exactly-equal totals, preserves createdAt on edit"},{"!!":"setBudget allocation guard: rejects lowering below allocated total, allows equal; deleteCategory cascades its cat:<id> row"},{"!!":"amount guards: zero and negative amounts are rejected by both setters ('Amount must be greater than 0') with no writes"},{"?":"setBudget preserves createdAt while refreshing updatedAt; single 'overall' row"},{"?":"getMonthlySpent sums only current-month expenses (0 when none)"},{"?":"getMonthlySpentByCategory keys by category name, expenses only"},{"?":"Empty/all-skipped imports return imported=0 with no partial writes"},{"*":"updateCategory type-change with existing transactions throws before touching the DB"}]} */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- In-memory mock of the Dexie db ---------------------------------------
// vi.hoisted guarantees mockDb/stores exist before vi.mock factories run.
const { mockDb, transactionsStore, categoriesStore, budgetsStore } = vi.hoisted(() => {
  const transactionsStore: Array<{ id: string; [key: string]: unknown }> = [];
  const categoriesStore: Array<{ id: string; [key: string]: unknown }> = [];
  const budgetsStore: Array<{ id: string; [key: string]: unknown }> = [];

  function makeTable<T extends { id: string }>(store: T[]) {
    return {
      _store: store,
      add: vi.fn(async (item: T) => {
        store.push(item);
        return item;
      }),
      put: vi.fn(async (item: T) => {
        const i = store.findIndex((x) => x.id === item.id);
        if (i >= 0) store[i] = item;
        else store.push(item);
        return item.id;
      }),
      update: vi.fn(async (id: string, changes: Partial<T>) => {
        const rec = store.find((x) => x.id === id);
        if (rec) Object.assign(rec, changes);
        return rec ? 1 : 0;
      }),
      delete: vi.fn(async (id: string) => {
        const i = store.findIndex((x) => x.id === id);
        if (i >= 0) store.splice(i, 1);
      }),
      get: vi.fn(async (id: string) => store.find((x) => x.id === id)),
      toArray: vi.fn(async () => [...store]),
      bulkAdd: vi.fn(async (items: T[]) => {
        store.push(...items);
      }),
      where: vi.fn((field: keyof T) => ({
        equals: vi.fn((val: unknown) => ({
          count: vi.fn(async () => store.filter((x) => x[field] === val).length),
          modify: vi.fn(async (changes: Partial<T>) => {
            for (const rec of store) {
              if (rec[field] === val) Object.assign(rec, changes);
            }
          }),
        })),
        between: vi.fn(
          (lo: unknown, hi: unknown, incLo = true, incHi = true) => ({
            toArray: vi.fn(async () =>
              store.filter((x) => {
                const v = x[field] as string;
                const l = lo as string;
                const h = hi as string;
                return (incLo ? v >= l : v > l) && (incHi ? v <= h : v < h);
              })
            ),
          })
        ),
      })),
    };
  }

  const db = {
    transactions: makeTable(transactionsStore),
    categories: makeTable(categoriesStore),
    budgets: makeTable(budgetsStore),
    transaction: vi.fn(async (_mode: string, ...args: unknown[]) => {
      const cb = args[args.length - 1];
      if (typeof cb === "function") return cb();
    }),
  };

  return { mockDb: db, transactionsStore, categoriesStore, budgetsStore };
});

vi.mock("@/lib/db/schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/schema")>();
  return { ...actual, db: mockDb };
});

// --- imports (must come after vi.mock) -------------------------------------
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  addCategory,
  updateCategory,
  deleteCategory,
  exportData,
  importTransactions,
  transactionCountForCategory,
  reassignCategory,
  getMonthlySpent,
  getCategoryBudgets,
  setCategoryBudget,
  deleteCategoryBudget,
  getMonthlySpentByCategory,
} from "@/lib/db/repository";
import { categoryBudgetId, parseCategoryBudgetId } from "@/lib/db/schema";
import { monthRange } from "@/lib/format";

beforeEach(() => {
  transactionsStore.length = 0;
  categoriesStore.length = 0;
  budgetsStore.length = 0;
  vi.clearAllMocks();
});

describe("addTransaction", () => {
  it("creates a transaction with a new id and createdAt", async () => {
    const before = Date.now();
    const tx = await addTransaction({
      type: "income",
      amount: 1000,
      category: "Salary",
      date: "2024-06-01",
    });
    const after = Date.now();
    expect(tx.id).toBeTruthy();
    expect(tx.type).toBe("income");
    expect(tx.amount).toBe(1000);
    expect(tx.category).toBe("Salary");
    expect(tx.description).toBeNull();
    expect(tx.date).toBe("2024-06-01");
    expect(tx.createdAt).toBeGreaterThanOrEqual(before);
    expect(tx.createdAt).toBeLessThanOrEqual(after);
    expect(transactionsStore).toHaveLength(1);
    expect(transactionsStore[0].id).toBe(tx.id);
  });

  it("trims a description and falls back to null", async () => {
    const tx = await addTransaction({
      type: "income",
      amount: 100,
      category: "Salary",
      description: "  bonus  ",
      date: "2024-06-01",
    });
    expect(tx.description).toBe("bonus");
  });
});

describe("updateTransaction", () => {
  it("updates an existing transaction", async () => {
    const { id } = await addTransaction({
      type: "income",
      amount: 100,
      category: "Salary",
      date: "2024-06-01",
    });
    await updateTransaction(id, {
      type: "expense",
      amount: 200,
      category: "Food",
      description: "refund",
      date: "2024-06-02",
    });
    expect(transactionsStore).toHaveLength(1);
    const updated = transactionsStore.find((t) => t.id === id)!;
    expect(updated.type).toBe("expense");
    expect(updated.amount).toBe(200);
    expect(updated.category).toBe("Food");
    expect(updated.description).toBe("refund");
    expect(updated.date).toBe("2024-06-02");
  });
});

describe("deleteTransaction", () => {
  it("removes a transaction by id", async () => {
    const { id } = await addTransaction({
      type: "expense",
      amount: 10,
      category: "Food",
      date: "2024-06-01",
    });
    await deleteTransaction(id);
    expect(transactionsStore.find((t) => t.id === id)).toBeUndefined();
    expect(transactionsStore).toHaveLength(0);
  });
});

describe("addCategory", () => {
  it("creates a category with null icon/color and trimmed name", async () => {
    const cat = await addCategory({ name: "  Food  ", type: "expense" });
    expect(cat.id).toBeTruthy();
    expect(cat.name).toBe("Food");
    expect(cat.type).toBe("expense");
    expect(cat.icon).toBeNull();
    expect(cat.color).toBeNull();
    expect(categoriesStore).toHaveLength(1);
  });
});

describe("updateCategory", () => {
  it("renames a category and cascades the rename to transactions", async () => {
    await addCategory({ name: "Food", type: "expense" });
    await addTransaction({
      type: "expense",
      amount: 10,
      category: "Food",
      date: "2024-06-01",
    });
    await updateCategory(categoriesStore[0].id, { name: "Groceries", type: "expense" });
    expect(categoriesStore[0].name).toBe("Groceries");
    expect(transactionsStore[0].category).toBe("Groceries");
  });

  it("throws when changing type of a category that has transactions", async () => {
    await addCategory({ name: "Food", type: "expense" });
    await addTransaction({
      type: "expense",
      amount: 10,
      category: "Food",
      date: "2024-06-01",
    });
    await expect(
      updateCategory(categoriesStore[0].id, { name: "Food", type: "income" })
    ).rejects.toThrow("Cannot change type while the category is in use");
  });

  it("allows changing type of an unused category", async () => {
    await addCategory({ name: "Savings", type: "income" });
    await updateCategory(categoriesStore[0].id, { name: "Savings", type: "expense" });
    expect(categoriesStore[0].type).toBe("expense");
  });

  it("throws when the category does not exist", async () => {
    await expect(
      updateCategory("missing", { name: "Food", type: "expense" })
    ).rejects.toThrow("Category not found");
  });
});

describe("deleteCategory", () => {
  it("removes a category by id", async () => {
    const cat = await addCategory({ name: "Food", type: "expense" });
    await deleteCategory(cat.id);
    expect(categoriesStore.find((c) => c.id === cat.id)).toBeUndefined();
  });
});

describe("exportData", () => {
  it("returns all transactions and categories", async () => {
    await addCategory({ name: "Salary", type: "income" });
    await addTransaction({ type: "income", amount: 100, category: "Salary", date: "2024-06-01" });
    const data = await exportData();
    expect(data.transactions).toHaveLength(1);
    expect(data.categories).toHaveLength(1);
  });
});

describe("transactionCountForCategory", () => {
  it("counts transactions matching a category name", async () => {
    await addTransaction({ type: "expense", amount: 10, category: "Food", date: "2024-06-01" });
    await addTransaction({ type: "expense", amount: 20, category: "Food", date: "2024-06-02" });
    await addTransaction({ type: "expense", amount: 30, category: "Rent", date: "2024-06-03" });
    expect(await transactionCountForCategory("Food")).toBe(2);
    expect(await transactionCountForCategory("Rent")).toBe(1);
    expect(await transactionCountForCategory("Travel")).toBe(0);
  });
});

describe("reassignCategory", () => {
  it("moves transactions from one category name to another", async () => {
    await addTransaction({ type: "expense", amount: 10, category: "Food", date: "2024-06-01" });
    await addTransaction({ type: "expense", amount: 20, category: "Rent", date: "2024-06-02" });
    await reassignCategory("Food", "Groceries");
    expect(transactionsStore[0].category).toBe("Groceries");
    expect(transactionsStore[1].category).toBe("Rent");
  });
});

describe("importTransactions", () => {
  it("imports valid rows and creates missing categories", async () => {
    const rows = [
      { type: "income", amount: 1000, category: "Salary", date: "2024-06-01" },
      { type: "expense", amount: 50, category: "Food", date: "2024-06-02", description: "lunch" },
    ];
    const result = await importTransactions(rows);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.createdCategories).toEqual(["Salary", "Food"]);
    expect(transactionsStore).toHaveLength(2);
    expect(categoriesStore).toHaveLength(2);
    // Imported transaction shares the stored (canonical) category name
    expect(transactionsStore[1].category).toBe("Food");
  });

  it("skips invalid rows and reports them", async () => {
    const rows = [
      { type: "income", amount: 0, category: "Salary", date: "2024-06-01" }, // invalid amount
      { type: "bogus", amount: 100, category: "Salary", date: "2024-06-01" }, // invalid type
      { type: "expense", amount: 10, category: "", date: "2024-06-01" }, // empty category
      { type: "expense", amount: 20, category: "Food", date: "2024-06-01" }, // valid
    ];
    const result = await importTransactions(rows);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(3);
    expect(result.createdCategories).toEqual(["Food"]);
    expect(transactionsStore).toHaveLength(1);
  });

  it("dedupes by existing transaction id", async () => {
    // Pre-seed a transaction with a known id
    await addTransaction({ type: "income", amount: 100, category: "Salary", date: "2024-06-01" });
    const existingId = transactionsStore[0].id;
    const rows = [
      { id: existingId, type: "income", amount: 100, category: "Salary", date: "2024-06-01" },
      { id: "dup-within-batch", type: "income", amount: 200, category: "Bonus", date: "2024-06-01" },
      { id: "dup-within-batch", type: "income", amount: 300, category: "Bonus", date: "2024-06-01" },
      { type: "expense", amount: 10, category: "Food", date: "2024-06-01" },
    ];
    const result = await importTransactions(rows);
    expect(result.imported).toBe(2);
    expect(result.skipped).toBe(2);
  });

  it("returns { imported: 0, skipped: 0, createdCategories: [] } for an empty batch with no partial writes", async () => {
    const result = await importTransactions([]);
    expect(result).toEqual({ imported: 0, skipped: 0, createdCategories: [] });
    expect(transactionsStore).toHaveLength(0);
    expect(categoriesStore).toHaveLength(0);
  });

  it("matches existing categories case-insensitively and reuses the stored name", async () => {
    await addCategory({ name: "Food", type: "expense" });
    const rows = [
      { type: "expense", amount: 10, category: "FOOD", date: "2024-06-01" },
    ];
    const result = await importTransactions(rows);
    // "FOOD" lowercases to "food" — matches the stored "Food" key
    expect(result.imported).toBe(1);
    expect(result.createdCategories).toEqual([]);
    expect(transactionsStore[0].category).toBe("Food");
  });
});

describe("getMonthlySpent", () => {
  it("sums current-month expenses only", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15)); // Aug 15 2026 -> month 2026-08-01..31
    try {
      await addTransaction({ type: "expense", amount: 100, category: "Food", date: "2026-08-01" });
      await addTransaction({ type: "expense", amount: 40, category: "Food", date: "2026-08-31" });
      await addTransaction({ type: "expense", amount: 999, category: "Rent", date: "2026-07-31" });
      await addTransaction({ type: "expense", amount: 888, category: "Rent", date: "2026-09-01" });
      await addTransaction({ type: "income", amount: 5000, category: "Salary", date: "2026-08-05" });
      expect(await getMonthlySpent()).toBe(140);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns 0 when there are no expenses this month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15));
    try {
      await addTransaction({ type: "income", amount: 5000, category: "Salary", date: "2026-08-05" });
      expect(await getMonthlySpent()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("category budget id helpers", () => {
  it("round-trips a category id", () => {
    const id = categoryBudgetId("abc123");
    expect(id).toBe("cat:abc123");
    expect(parseCategoryBudgetId(id)).toBe("abc123");
  });

  it("returns null for non-category rows", () => {
    expect(parseCategoryBudgetId("overall")).toBeNull();
  });
});

describe("setCategoryBudget", () => {
  it("creates then updates preserving createdAt", async () => {
    await setCategoryBudget("catA", 3000);
    let rows = await getCategoryBudgets();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("cat:catA");
    expect(rows[0].amount).toBe(3000);
    const created = rows[0].createdAt;
    await setCategoryBudget("catA", 4500);
    rows = await getCategoryBudgets();
    expect(rows[0].amount).toBe(4500);
    expect(rows[0].createdAt).toBe(created);
  });

  it("editing a row does not double-count itself", async () => {
    await setCategoryBudget("a", 6000);
    await setCategoryBudget("a", 9000);
    expect((await getCategoryBudgets())[0].amount).toBe(9000);
  });
});

describe("amount guards", () => {
  it("rejects zero amounts without writing", async () => {
    await expect(setCategoryBudget("a", 0)).rejects.toThrow(
      "Amount must be greater than 0"
    );
    expect(await getCategoryBudgets()).toHaveLength(0);
  });

  it("rejects negative amounts before other guards run", async () => {
    await expect(setCategoryBudget("a", -500)).rejects.toThrow(
      "Amount must be greater than 0"
    );
    expect(await getCategoryBudgets()).toHaveLength(0);
  });

  it("rejects empty categoryId", async () => {
    await expect(setCategoryBudget("", 500)).rejects.toThrow("Choose a category");
  });
});

describe("deleteCategoryBudget", () => {
  it("removes only its own row", async () => {
    await setCategoryBudget("a", 1000);
    await setCategoryBudget("b", 2000);
    await deleteCategoryBudget("a");
    const rows = await getCategoryBudgets();
    expect(rows.map((r) => r.id)).toEqual(["cat:b"]);
  });
});

describe("deleteCategory cascade", () => {
  it("deletes the category's breakdown row atomically", async () => {
    const cat = await addCategory({ name: "Food", type: "expense" });
    await setCategoryBudget(cat.id, 2500);
    await deleteCategory(cat.id);
    expect(await getCategoryBudgets()).toHaveLength(0);
  });
});

describe("getMonthlySpentByCategory", () => {
  it("sums current-month expenses per category name", async () => {
    const { start } = monthRange();
    await addTransaction({ type: "expense", amount: 200, category: "Food", date: start });
    await addTransaction({ type: "expense", amount: 100, category: "Food", date: start });
    await addTransaction({ type: "expense", amount: 50, category: "Transport", date: start });
    await addTransaction({ type: "income", amount: 999, category: "Salary", date: start });
    const spent = await getMonthlySpentByCategory();
    expect(spent["Food"]).toBe(300);
    expect(spent["Transport"]).toBe(50);
    expect(spent["Salary"]).toBeUndefined();
  });
});
