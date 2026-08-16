/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/validations/transaction.ts — Zod schema parsing, coercion, and inferred input types.","IDD":[{"?":"transactionSchema coerces amount to number and allows optional id/description"}],"A":[{"!":"lib/validations/transaction.ts","exercised by these tests"},{"?":"lib/db/repository.ts","safeParse gates imported rows"},{"?":"components/transactions/TransactionForm.tsx","resolver uses TransactionInput"}],"AB":[{"?":"vitest.config.ts"}],"E":[{"!!":"npm test validation"},{"?":"Positive amount enforcement is user-facing — verify error messages"},{"*":"amount coercion from string to number is the key import path"}]} */
import { describe, it, expect } from "vitest";
import {
  transactionSchema,
  categorySchema,
  type TransactionInput,
  type CategoryInput,
} from "@/lib/validations/transaction";

describe("transactionSchema", () => {
  it("parses a valid complete transaction", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: "125.50",
      category: "Food",
      description: "lunch",
      date: "2024-06-01",
    });
    expect(result.success).toBe(true);
    const data = result.data as TransactionInput;
    expect(data.amount).toBe(125.5);
    expect(data.type).toBe("expense");
    expect(data.description).toBe("lunch");
  });

  it("coerces a string amount to a number", () => {
    const result = transactionSchema.safeParse({
      type: "income",
      amount: "1000",
      category: "Salary",
      date: "2024-06-01",
    });
    expect(result.success).toBe(true);
    expect((result.data as TransactionInput).amount).toBe(1000);
  });

  it("accepts a numeric amount directly", () => {
    const result = transactionSchema.safeParse({
      type: "income",
      amount: 500,
      category: "Bonus",
      date: "2024-06-01",
    });
    expect(result.success).toBe(true);
    expect((result.data as TransactionInput).amount).toBe(500);
  });

  it("rejects a zero amount", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: 0,
      category: "Food",
      date: "2024-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: -50,
      category: "Food",
      date: "2024-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid type", () => {
    const result = transactionSchema.safeParse({
      type: "transfer",
      amount: 100,
      category: "Food",
      date: "2024-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty category", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: 100,
      category: "",
      date: "2024-06-01",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing date", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: 100,
      category: "Food",
    });
    expect(result.success).toBe(false);
  });

  it("trims and optionally accepts description", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: 100,
      category: "Food",
      date: "2024-06-01",
      description: "  dinner  ",
    });
    expect(result.success).toBe(true);
    expect((result.data as TransactionInput).description).toBe("dinner");
  });

  it("rejects a description longer than 200 characters", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: 100,
      category: "Food",
      date: "2024-06-01",
      description: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description exactly 200 characters", () => {
    const result = transactionSchema.safeParse({
      type: "expense",
      amount: 100,
      category: "Food",
      date: "2024-06-01",
      description: "x".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("accepts an optional id", () => {
    const result = transactionSchema.safeParse({
      id: "abc-123",
      type: "income",
      amount: 100,
      category: "Salary",
      date: "2024-06-01",
    });
    expect(result.success).toBe(true);
    expect((result.data as TransactionInput).id).toBe("abc-123");
  });
});

describe("categorySchema", () => {
  it("parses a valid category", () => {
    const result = categorySchema.safeParse({
      name: "Food",
      type: "expense",
    });
    expect(result.success).toBe(true);
    expect((result.data as CategoryInput).name).toBe("Food");
  });

  it("rejects an empty name", () => {
    const result = categorySchema.safeParse({ name: "", type: "expense" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid type", () => {
    const result = categorySchema.safeParse({ name: "Food", type: "savings" });
    expect(result.success).toBe(false);
  });
});
