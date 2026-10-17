import { describe, expect, it } from "vitest";
import { roleAllows } from "@/lib/auth/roles";

describe("dashboard roles", () => {
  it("lets a viewer read and nothing else", () => {
    expect(roleAllows("viewer", "read")).toBe(true);
    expect(roleAllows("viewer", "write")).toBe(false);
    expect(roleAllows("viewer", "credentials")).toBe(false);
    expect(roleAllows("viewer", "operate")).toBe(false);
  });

  it("lets a developer change resources but not keys", () => {
    expect(roleAllows("developer", "write")).toBe(true);
    expect(roleAllows("developer", "credentials")).toBe(false);
  });

  it("reserves key management and quotas for owner and admin", () => {
    expect(roleAllows("admin", "credentials")).toBe(true);
    expect(roleAllows("owner", "admin")).toBe(true);
    expect(roleAllows("billing", "credentials")).toBe(false);
    expect(roleAllows("billing", "admin")).toBe(false);
  });
});
