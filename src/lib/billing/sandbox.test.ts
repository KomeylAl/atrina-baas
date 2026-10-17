import { describe, expect, it } from "vitest";
import { environmentAllowsStoreSimulation } from "@/lib/billing/sandbox";

describe("store simulation flag", () => {
  it("allows development and staging only", () => {
    expect(environmentAllowsStoreSimulation("development")).toBe(true);
    expect(environmentAllowsStoreSimulation("staging")).toBe(true);
    expect(environmentAllowsStoreSimulation("production")).toBe(false);
    expect(environmentAllowsStoreSimulation("custom")).toBe(false);
  });
});
