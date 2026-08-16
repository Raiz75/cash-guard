/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/csv.ts — CSV parsing: quoted fields with commas/escapes, BOM stripping, CRLF, comments, and header-column mapping.","IDD":[{"?":"parseTransactionsCSV is pure (no DOM/IO) so tests can assert exact row shapes"}],"A":[{"!":"lib/csv.ts","exercised by these tests"},{"?":"lib/db/repository.ts","rows flow here via importTransactions"}],"AB":[{"?":"vitest.config.ts","happy-dom env"}],"E":[{"!!":"npm test csv"},{"?":"Verify quoted commas, \"\" escapes, BOM, and CRLF are handled — these are the trickiest parse paths"}]} */
import { describe, it, expect } from "vitest";
import { parseTransactionsCSV } from "@/lib/csv";

describe("parseTransactionsCSV", () => {
  it("returns an error when the CSV is empty", () => {
    const { rows, error } = parseTransactionsCSV("");
    expect(error).toBe("CSV is empty");
    expect(rows).toEqual([]);
  });

  it("returns an error when the CSV has only blank lines", () => {
    const { rows, error } = parseTransactionsCSV("\n  \n");
    expect(error).toBe("CSV is empty");
    expect(rows).toEqual([]);
  });

  it("returns an error when required columns are missing", () => {
    const { rows, error } = parseTransactionsCSV("date,category\n2024-01-01,Food");
    expect(error).toBe("CSV must have date, type, amount, category columns");
    expect(rows).toEqual([]);
  });

  it("skips blank lines and # comment lines", () => {
    const csv = `
# a comment
date,type,amount,category
2024-06-01,income,100.00,Salary

2024-06-02,expense,50.00,Food
`;
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: "2024-06-01",
      type: "income",
      amount: 100.0,
      category: "Salary",
    });
  });

  it("parses a basic CSV with all columns", () => {
    const csv = "date,type,amount,category,description,id\n2024-06-01,income,100,salary,paycheck,abc";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: "abc",
      date: "2024-06-01",
      type: "income",
      amount: 100,
      category: "salary",
      description: "paycheck",
    });
  });

  it("strips a leading BOM", () => {
    const csv = "\uFEFFdate,type,amount,category\n2024-06-01,income,100,Salary";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe("Salary");
  });

  it("handles CRLF line endings", () => {
    const csv = "date,type,amount,category\r\n2024-06-01,income,100,Salary\r\n";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(100);
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'date,type,amount,category,description\n2024-06-01,expense,25.50,"Food, Drink",lunch';
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows[0].category).toBe("Food, Drink");
    expect(rows[0].description).toBe("lunch");
  });

  it("handles double-quote escapes inside quoted fields", () => {
    const csv = 'date,type,amount,category,description\n2024-06-01,expense,10,Category,"said ""hi"""';
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows[0].description).toBe('said "hi"');
  });

  it("skips rows with NaN amount or empty required fields", () => {
    const csv = "date,type,amount,category\n2024-06-01,income,abc,Salary\n2024-06-02,,50,Food\n2024-06-03,expense,50,";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows).toEqual([]);
  });

  it("trims and lowercases headers (case-insensitive columns)", () => {
    const csv = "Date,Type,Amount,Category,Description\n2024-06-01,income,100,Salary,bonus";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows[0]).toMatchObject({
      date: "2024-06-01",
      type: "income",
      amount: 100,
      category: "Salary",
      description: "bonus",
    });
  });

  it("omits description from the row object when the column is empty", () => {
    const csv = "date,type,amount,category,description\n2024-06-01,income,100,Salary,";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows[0].description).toBeUndefined();
  });

  it("includes description when the column has a value", () => {
    const csv = "date,type,amount,category,description\n2024-06-01,income,100,Salary,bonus";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows[0].description).toBe("bonus");
  });

  it("returns empty rows with null error when only headers are present", () => {
    const csv = "date,type,amount,category";
    const { rows, error } = parseTransactionsCSV(csv);
    expect(error).toBeNull();
    expect(rows).toEqual([]);
  });
});
