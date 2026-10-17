import { AsyncLocalStorage } from "node:async_hooks";
import type { DataPlaneContext } from "@/lib/auth/project/data-plane";

/**
 * Trusted data-plane context for in-process calls (dashboard Try it out).
 * This never reads client headers. Only server code that already authorized
 * the caller may enter this store.
 */
type Override = {
  ctx: DataPlaneContext;
  authorization: string | null;
};

const storage = new AsyncLocalStorage<Override>();

export function getDataPlaneOverride(): Override | undefined {
  return storage.getStore();
}

export function runWithDataPlaneOverride<T>(override: Override, fn: () => T): T {
  return storage.run(override, fn);
}
