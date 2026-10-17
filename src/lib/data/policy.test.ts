import { describe, expect, it } from "vitest";
import { policyAllows } from "@/lib/data/schema";

const policies = [
  { operation: "select", subject: "authenticated", enabled: true },
  { operation: "select", subject: "anonymous", enabled: false },
  { operation: "update", subject: "owner", enabled: true },
  { operation: "delete", subject: "service", enabled: true },
];

describe("data policy", () => {
  it("allows an authenticated select and ignores a disabled anonymous policy", () => {
    expect(policyAllows(policies, "select", { hasUser: true, isService: false, isOwner: false })).toBe(true);
    expect(policyAllows(policies, "select", { hasUser: false, isService: false, isOwner: false })).toBe(false);
  });

  it("requires ownership for owner updates", () => {
    expect(policyAllows(policies, "update", { hasUser: true, isService: false, isOwner: false })).toBe(false);
    expect(policyAllows(policies, "update", { hasUser: true, isService: false, isOwner: true })).toBe(true);
  });

  it("allows service delete only for a service credential", () => {
    expect(policyAllows(policies, "delete", { hasUser: false, isService: true, isOwner: false })).toBe(true);
    expect(policyAllows(policies, "delete", { hasUser: true, isService: false, isOwner: true })).toBe(false);
  });

  it("denies an operation with no enabled policy", () => {
    expect(policyAllows(policies, "insert", { hasUser: true, isService: true, isOwner: true })).toBe(false);
  });
});
