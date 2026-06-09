import { describe, it, expect } from "vitest";
import { localDateStr, TODAY } from "./constants";

describe("localDateStr", () => {
  it("formats a local date as YYYY-MM-DD with zero-padding", () => {
    // Month is 0-indexed in the Date constructor; these are local-time dates.
    expect(localDateStr(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateStr(new Date(2026, 11, 31))).toBe("2026-12-31");
    expect(localDateStr(new Date(2026, 8, 9))).toBe("2026-09-09");
  });

  it("uses local calendar fields, not UTC (no day-shift near midnight)", () => {
    // 11:30pm local on the 5th must stay the 5th regardless of timezone.
    const d = new Date(2026, 2, 5, 23, 30, 0);
    expect(localDateStr(d)).toBe("2026-03-05");
  });
});

describe("TODAY", () => {
  it("returns today's local date in YYYY-MM-DD form", () => {
    expect(TODAY()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TODAY()).toBe(localDateStr(new Date()));
  });
});
