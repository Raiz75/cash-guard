import { getSupabase } from "@/lib/supabase/client";
import { invalidateFinance } from "@/lib/query/client";
import { monthRange } from "@/lib/format";
import { csvRowSchema, type TransactionInput, type CategoryInput } from "@/lib/validations/transaction";
import type { CsvRow } from "@/lib/csv";
import type { Category, Transaction, Budget, TransactionType } from "@/lib/db/types";

const TRANSACTION_SELECT =
  "id, type, amount, category_id, description, date, created_at, categories!transactions_category_fk(name)";
const CHUNK_SIZE = 500;
const PAGE_SIZE = 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageQuery<T> {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
}

function toError(error: unknown, fallback: string): Error {
  const msg = (error as { message?: string } | null | undefined)?.message;
  return new Error(msg?.trim() || fallback);
}

async function fetchAllPages<T>(buildPage: () => PageQuery<T>, fallback: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    // A fresh builder per page: PostgREST merges repeated .range() calls on the same builder.
    const { data, error } = await buildPage().range(from, from + PAGE_SIZE - 1);
    if (error) throw toError(error, fallback);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function categoryError(error: unknown): Error {
  if ((error as { code?: string } | null | undefined)?.code === "23505") {
    return new Error("A category with that name already exists");
  }
  return toError(error, "Failed to save category");
}

function deleteCategoryError(error: unknown): Error {
  if ((error as { code?: string } | null | undefined)?.code === "23503") {
    return new Error("This category is used by transactions. Move them first.");
  }
  return toError(error, "Failed to delete category");
}

function embeddedName(categories: unknown): string {
  return (categories as { name?: string } | null | undefined)?.name ?? "";
}

function mapTransactionRow(row: unknown): Transaction {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    type: r.type as Transaction["type"],
    amount: Number(r.amount),
    categoryId: r.category_id as string,
    category: embeddedName(r.categories),
    description: (r.description as string | null) ?? null,
    date: r.date as string,
    createdAt: new Date(r.created_at as string).getTime(),
  };
}

function mapBudgetRow(row: unknown): Budget {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    categoryId: r.category_id as string,
    amount: Number(r.amount),
    createdAt: new Date(r.created_at as string).getTime(),
    updatedAt: new Date(r.updated_at as string).getTime(),
  };
}

async function resolveCategory(type: TransactionType, name: string): Promise<Category> {
  const categories = await listCategories();
  const found = categories.find(
    (c) => c.type === type && c.name.trim().toLowerCase() === name.trim().toLowerCase()
  );
  if (!found) throw new Error(`Category "${name.trim()}" not found`);
  return found;
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from("categories")
    .select("id, name, type, icon, color")
    .order("name", { ascending: true });
  if (error) throw toError(error, "Failed to load categories");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon ?? null,
    color: row.color ?? null,
  }));
}

export async function listTransactions(): Promise<Transaction[]> {
  const buildPage = () =>
    getSupabase()
      .from("transactions")
      .select(TRANSACTION_SELECT)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
  const rows = await fetchAllPages(buildPage, "Failed to load transactions");
  return rows.map(mapTransactionRow);
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const category = await resolveCategory(input.type, input.category);
  const { data, error } = await getSupabase()
    .from("transactions")
    .insert({
      type: input.type,
      amount: input.amount,
      category_id: category.id,
      description: input.description?.trim() || null,
      date: input.date,
    })
    .select("id, type, amount, category_id, description, date, created_at")
    .single();
  if (error) throw toError(error, "Failed to add transaction");
  const row = data as { id: string; type: TransactionType; amount: string | number; category_id: string; description: string | null; date: string; created_at: string };
  await invalidateFinance();
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    categoryId: row.category_id,
    category: category.name,
    description: row.description ?? null,
    date: row.date,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  const category = await resolveCategory(input.type, input.category);
  const { error } = await getSupabase()
    .from("transactions")
    .update({
      type: input.type,
      amount: input.amount,
      category_id: category.id,
      description: input.description?.trim() || null,
      date: input.date,
    })
    .eq("id", id);
  if (error) throw toError(error, "Failed to update transaction");
  await invalidateFinance();
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await getSupabase().from("transactions").delete().eq("id", id);
  if (error) throw toError(error, "Failed to delete transaction");
  await invalidateFinance();
}

export async function addCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await getSupabase()
    .from("categories")
    .insert({ name: input.name.trim(), type: input.type })
    .select("id, name, type, icon, color")
    .single();
  if (error) throw categoryError(error);
  const row = data as { id: string; name: string; type: TransactionType; icon: string | null; color: string | null };
  await invalidateFinance();
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon ?? null,
    color: row.color ?? null,
  };
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const { data: current, error: fetchError } = await getSupabase()
    .from("categories")
    .select("id, name, type")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw toError(fetchError, "Failed to load category");
  if (!current) throw new Error("Category not found");
  const cur = current as { id: string; name: string; type: TransactionType };
  if (input.type !== cur.type) {
    const count = await transactionCountForCategory(id);
    if (count > 0) throw new Error("Cannot change type while the category is in use");
  }
  const { error } = await getSupabase()
    .from("categories")
    .update({ name: input.name.trim(), type: input.type })
    .eq("id", id);
  if (error) throw categoryError(error);
  await invalidateFinance();
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await getSupabase().from("categories").delete().eq("id", id);
  if (error) throw deleteCategoryError(error);
  await invalidateFinance();
}

export async function transactionCountForCategory(categoryId: string): Promise<number> {
  const { data, error } = await getSupabase()
    .from("transactions")
    .select("id")
    .eq("category_id", categoryId);
  if (error) throw toError(error, "Failed to count transactions");
  return data?.length ?? 0;
}

export async function reassignCategory(fromCategoryId: string, toCategoryId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("transactions")
    .update({ category_id: toCategoryId })
    .eq("category_id", fromCategoryId);
  if (error) throw toError(error, "Failed to reassign category");
  await invalidateFinance();
}

export async function getCategoryBudgets(): Promise<Budget[]> {
  const { data, error } = await getSupabase()
    .from("budgets")
    .select("id, category_id, amount, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw toError(error, "Failed to load budgets");
  return (data ?? []).map(mapBudgetRow);
}

export async function setCategoryBudget(categoryId: string, amount: number): Promise<void> {
  if (!categoryId) throw new Error("Choose a category");
  if (amount <= 0) throw new Error("Amount must be greater than 0");
  const { error } = await getSupabase()
    .from("budgets")
    .upsert({ category_id: categoryId, amount }, { onConflict: "user_id,category_id" });
  if (error) throw toError(error, "Failed to save budget");
  await invalidateFinance();
}

export async function deleteCategoryBudget(categoryId: string): Promise<void> {
  const { error } = await getSupabase().from("budgets").delete().eq("category_id", categoryId);
  if (error) throw toError(error, "Failed to delete budget");
  await invalidateFinance();
}

export async function getMonthlySpent(): Promise<number> {
  const { start, end } = monthRange();
  const { data, error } = await getSupabase()
    .from("transactions")
    .select("amount")
    .eq("type", "expense")
    .gte("date", start)
    .lte("date", end);
  if (error) throw toError(error, "Failed to load monthly spend");
  return (data ?? []).reduce((sum: number, row) => sum + Number(row.amount), 0);
}

export async function getMonthlySpentByCategory(): Promise<Record<string, number>> {
  const { start, end } = monthRange();
  const buildPage = () =>
    getSupabase()
      .from("transactions")
      .select(TRANSACTION_SELECT)
      .eq("type", "expense")
      .gte("date", start)
      .lte("date", end);
  const rows = await fetchAllPages(buildPage, "Failed to load monthly spend");
  const spent: Record<string, number> = {};
  for (const row of rows) {
    const mapped = mapTransactionRow(row);
    const name = mapped.category;
    spent[name] = (spent[name] ?? 0) + mapped.amount;
  }
  return spent;
}

export async function exportData(): Promise<{ transactions: Transaction[]; categories: Category[] }> {
  const [transactions, categories] = await Promise.all([listTransactions(), listCategories()]);
  return { transactions, categories };
}

export async function importTransactions(
  rows: CsvRow[]
): Promise<{ imported: number; skipped: number; createdCategories: string[] }> {
  if (rows.length === 0) {
    return { imported: 0, skipped: 0, createdCategories: [] };
  }
  const buildPage = () =>
    getSupabase().from("transactions").select("id");
  const existingRows = await fetchAllPages(buildPage, "Failed to load transactions");
  const existingIds = new Set((existingRows ?? []).map((r) => String(r.id).toLowerCase()));

  const categories = await listCategories();
  const categoryMap = new Map<string, { id: string; name: string }>();
  for (const c of categories) {
    categoryMap.set(`${c.type}:${c.name.trim().toLowerCase()}`, { id: c.id, name: c.name });
  }

  const batchIds = new Set<string>();
  const newCategories = new Map<string, string>();
  const createdCategories: string[] = [];
  const drafts: Array<{
    id: string;
    type: TransactionType;
    amount: number;
    categoryKey: string;
    description: string | null;
    date: string;
  }> = [];
  let skipped = 0;

  for (const row of rows) {
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) {
      skipped++;
      continue;
    }
    const { id, type, amount, category, description, date } = parsed.data;
    let txId = id?.trim();
    const isUuid = !!txId && UUID_RE.test(txId);
    if (isUuid) {
      const lower = txId!.toLowerCase();
      if (existingIds.has(lower) || batchIds.has(lower)) {
        skipped++;
        continue;
      }
    }
    const categoryKey = `${type}:${category.trim().toLowerCase()}`;
    if (!categoryMap.has(categoryKey) && !newCategories.has(categoryKey)) {
      newCategories.set(categoryKey, category.trim());
      createdCategories.push(category.trim());
    }
    if (isUuid) {
      batchIds.add(txId!.toLowerCase());
    } else {
      const newId = crypto.randomUUID();
      txId = newId;
      batchIds.add(newId.toLowerCase());
    }
    drafts.push({
      id: txId!,
      type,
      amount,
      categoryKey,
      description: description?.trim() || null,
      date,
    });
  }

  if (newCategories.size > 0) {
    const catRows = [...newCategories.entries()].map(([key, name]) => ({
      name,
      type: key.split(":")[0],
    }));
    const { data: insertedCats, error: catError } = await getSupabase()
      .from("categories")
      .insert(catRows)
      .select("id, name, type");
    if (catError) throw categoryError(catError);
    for (const c of insertedCats ?? []) {
      categoryMap.set(`${c.type}:${String(c.name).trim().toLowerCase()}`, {
        id: c.id,
        name: c.name,
      });
    }
  }

  const toAdd: Record<string, unknown>[] = [];
  for (const d of drafts) {
    const cat = categoryMap.get(d.categoryKey);
    if (!cat) {
      skipped++;
      continue;
    }
    toAdd.push({
      id: d.id,
      type: d.type,
      amount: d.amount,
      category_id: cat.id,
      description: d.description,
      date: d.date,
    });
  }

  let imported = 0;
  try {
    if (toAdd.length > 0) {
      for (let i = 0; i < toAdd.length; i += CHUNK_SIZE) {
        const chunk = toAdd.slice(i, i + CHUNK_SIZE);
        const { error } = await getSupabase().from("transactions").insert(chunk);
        if (error && (error as { code?: string }).code === "23505") {
          // Retry once with fresh UUIDs for the whole chunk.
          const retryChunk = chunk.map((row) => ({ ...row, id: crypto.randomUUID() }));
          const { error: retryError } = await getSupabase().from("transactions").insert(retryChunk);
          if (retryError) throw toError(retryError, "Failed to import transactions");
        } else if (error) {
          throw toError(error, "Failed to import transactions");
        }
        imported += chunk.length;
      }
    }
  } finally {
    if (imported > 0) {
      await invalidateFinance();
    }
  }
  return { imported, skipped, createdCategories };
}