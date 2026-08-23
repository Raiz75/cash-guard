import { describe, it, expect } from "vitest";
import { paginate } from "@/lib/paginate";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe("paginate", () => {
  it("slices the requested page", () => {
    const { rows, totalPages } = paginate(range(25), 2, 10);
    expect(rows).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(totalPages).toBe(3);
  });

  it("handles an exact multiple as a full last page", () => {
    const { rows, totalPages } = paginate(range(20), 2, 10);
    expect(totalPages).toBe(2);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toBe(11);
  });

  it("clamps pages beyond the range to the last page", () => {
    const { rows, totalPages } = paginate(range(25), 99, 10);
    expect(totalPages).toBe(3);
    expect(rows).toEqual([21, 22, 23, 24, 25]);
  });

  it("clamps non-positive pages to page 1", () => {
    expect(paginate(range(25), 0, 10).rows[0]).toBe(1);
    expect(paginate(range(25), -3, 10).rows[0]).toBe(1);
  });

  it("returns one empty page for empty input", () => {
    expect(paginate([], 1, 10)).toEqual({ rows: [], totalPages: 1 });
  });

  it("treats a non-positive size as 1", () => {
    expect(paginate([1, 2], 2, 0)).toEqual({ rows: [2], totalPages: 2 });
  });
});
