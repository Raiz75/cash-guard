/* AI-CONTEXT-NOTE:{"R":"Vitest tests for lib/format.ts — PHP currency formatting, ISO date helpers, range math, and downloadFile().","IDD":[{"?":"Uses fixed UTC dates for deterministic rangeStartISO monthRange assertions"},{"?":"formatPeso uses Intl.NumberFormat en-PH/PHP — locale must be available in the test env (happy-dom)"},{"?":"rangeStartISO and rangeEndDateISO now accept DateFilter objects instead of plain strings"}],"A":[{"!":"lib/format.ts","exercised by these tests"}],"AB":[{"?":"vitest.config.ts","happy-dom env provides Intl"}],"E":[{"!!":"npm test format"},{"?":"toISODate zero-padding drives lexicographic range comparisons — verify edge months/days"},{"?":"Verify rangeStartISO handles all/today/bydate/daterange DateFilter variants"},{"?":"Verify rangeEndDateISO returns endDate for daterange, null otherwise"},{"*":"downloadFile mutates document.body (append + remove); guard with try/catch if needed"}]} */
import { describe, it, expect, vi } from "vitest";
import {
  formatPeso,
  toISODate,
  todayISO,
  monthRange,
  rangeStartISO,
  rangeEndDateISO,
  formatDisplayDate,
  downloadFile,
} from "@/lib/format";

describe("formatPeso", () => {
  it("formats a whole number with PHP symbol and 2 decimals", () => {
    expect(formatPeso(1500)).toBe("₱1,500.00");
  });

  it("formats cents and negative values", () => {
    expect(formatPeso(99.99)).toBe("₱99.99");
    expect(formatPeso(-2500.5)).toBe("-₱2,500.50");
  });

  it("handles zero", () => {
    expect(formatPeso(0)).toBe("₱0.00");
  });
});

describe("toISODate", () => {
  it("zero-pads month and day for single-digit values", () => {
    const d = new Date(2024, 0, 5); // 2024-01-05 local
    expect(toISODate(d)).toBe("2024-01-05");
  });

  it("handles year-end boundary", () => {
    const d = new Date(2024, 11, 31);
    expect(toISODate(d)).toBe("2024-12-31");
  });
});

describe("todayISO", () => {
  it("returns today in ISO format", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(todayISO()).toBe(expected);
  });
});

describe("monthRange", () => {
  it("returns the first and last day of the given month", () => {
    const range = monthRange(new Date(2024, 5, 15)); // June 2024
    expect(range.start).toBe("2024-06-01");
    expect(range.end).toBe("2024-06-30");
  });

  it("handles 31-day months", () => {
    const range = monthRange(new Date(2024, 0, 10)); // January 2024
    expect(range.start).toBe("2024-01-01");
    expect(range.end).toBe("2024-01-31");
  });

  it("handles February leap year", () => {
    const range = monthRange(new Date(2024, 1, 1)); // February 2024
    expect(range.end).toBe("2024-02-29");
  });
});

describe("rangeStartISO", () => {
  it("returns null for 'all'", () => {
    expect(rangeStartISO({ range: "all" })).toBeNull();
  });

  it("returns today for 'today'", () => {
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(rangeStartISO({ range: "today" })).toBe(expected);
  });

  it("returns the date field for 'bydate'", () => {
    expect(rangeStartISO({ range: "bydate", date: "2026-03-15" })).toBe("2026-03-15");
  });

  it("returns null for 'bydate' when date is missing", () => {
    expect(rangeStartISO({ range: "bydate" })).toBeNull();
  });

  it("returns startDate for 'daterange'", () => {
    expect(rangeStartISO({ range: "daterange", startDate: "2026-01-01", endDate: "2026-01-31" })).toBe("2026-01-01");
  });

  it("returns null for 'daterange' when startDate is missing", () => {
    expect(rangeStartISO({ range: "daterange", endDate: "2026-01-31" })).toBeNull();
  });
});

describe("rangeEndDateISO", () => {
  it("returns endDate for 'daterange'", () => {
    expect(rangeEndDateISO({ range: "daterange", startDate: "2026-01-01", endDate: "2026-01-31" })).toBe("2026-01-31");
  });

  it("returns null for 'daterange' when endDate is missing", () => {
    expect(rangeEndDateISO({ range: "daterange", startDate: "2026-01-01" })).toBeNull();
  });

  it("returns null for 'all'", () => {
    expect(rangeEndDateISO({ range: "all" })).toBeNull();
  });

  it("returns null for 'today'", () => {
    expect(rangeEndDateISO({ range: "today" })).toBeNull();
  });

  it("returns null for 'bydate'", () => {
    expect(rangeEndDateISO({ range: "bydate", date: "2026-03-15" })).toBeNull();
  });
});

describe("formatDisplayDate", () => {
  it("formats an ISO date to a short en-PH display string", () => {
    const result = formatDisplayDate("2024-06-15");
    expect(result).toMatch(/Jun 15, 2024/);
  });

  it("handles January (month boundary)", () => {
    const result = formatDisplayDate("2024-01-01");
    expect(result).toMatch(/Jan 1, 2024/);
  });
});

describe("downloadFile", () => {
  it("creates a link, triggers click, and cleans up", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const clickSpy = vi.fn();
    const originalCreate = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      el.click = clickSpy;
      return el;
    });

    downloadFile("export.csv", "a,b\n1,2", "text/csv");

    expect(appendSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });
});
