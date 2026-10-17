import type { Prisma } from "@prisma/client";

export function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

const COLUMN = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

export type RecordFilter = Record<string, string | number | boolean>;

export function parseRecordFilter(
  raw: string | null
): { ok: true; filter: RecordFilter | null } | { ok: false; error: string } {
  if (!raw) return { ok: true, filter: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "فیلتر باید JSON باشد." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "فیلتر باید یک شیء باشد." };
  }
  const filter: RecordFilter = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!COLUMN.test(key)) return { ok: false, error: `ستون «${key}» نامعتبر است.` };
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      return { ok: false, error: `مقدار «${key}» باید رشته، عدد یا بولین باشد.` };
    }
    filter[key] = value;
  }
  return { ok: true, filter };
}

/** Equality filters pushed into PostgreSQL jsonb, not applied after JSON.parse. */
export function recordFilterWhere(filter: RecordFilter | null): Prisma.DataRecordWhereInput[] {
  if (!filter) return [];
  return Object.entries(filter).map(([key, value]) => ({
    data: { path: [key], equals: value },
  }));
}

export function readRecordData(value: unknown): unknown {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}
