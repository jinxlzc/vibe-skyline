import { it, expect } from "vitest";
import fc from "fast-check";
import { Tokens, DailyValue, safeAdd } from "./index";
it("inclusive accounting and unknown/zero remain distinct", () => {
  expect(Tokens.safeParse({ in: 10, out: 5, cacheRead: 11 }).success).toBe(
    false,
  );
  expect(Tokens.safeParse({ in: 10, out: 5, reasoning: 6 }).success).toBe(
    false,
  );
  expect(
    DailyValue.safeParse({
      date: "2026-01-01",
      value: 0,
      state: "unknown",
      quality: "reported",
      completeness: "unknown",
    }).success,
  ).toBe(false);
  expect(() => safeAdd(Number.MAX_SAFE_INTEGER, 1)).toThrow();
});
it("safe addition conserves integer totals", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 1e9 }),
      fc.integer({ min: 0, max: 1e9 }),
      (a, b) => {
        expect(safeAdd(a, b)).toBe(a + b);
      },
    ),
  );
});
