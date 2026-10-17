import { describe, expect, it } from "vitest";
import { evaluateQuota } from "@/lib/quotas/decision";

describe("quota decision", () => {
  it("allows usage below the limit", () => {
    expect(evaluateQuota(9, 10)).toEqual({ allowed: true, current: 9, limit: 10, remaining: 1 });
  });

  it("denies usage at the limit", () => {
    expect(evaluateQuota(10, 10).allowed).toBe(false);
    expect(evaluateQuota(10, 10).remaining).toBe(0);
  });

  it("denies a zero limit and a non-finite current value", () => {
    expect(evaluateQuota(0, 0).allowed).toBe(false);
    expect(evaluateQuota(Number.NaN, 100).allowed).toBe(false);
  });
});
