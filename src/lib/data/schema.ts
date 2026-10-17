import { z } from "zod";

/**
 * Column types — comprehensive list of types supported by Atrina BaaS data API.
 *
 * Primitive types:
 * - "string"     — short string (max 256 chars by default, configurable via maxLength)
 * - "text"       — long string (no length limit, useful for descriptions/bodies)
 * - "integer"    — 32-bit integer (whole numbers)
 * - "decimal"    — floating-point number, useful for prices, weights
 * - "boolean"    — true/false
 * - "datetime"   — ISO 8601 timestamp (UTC)
 * - "date"       — date-only (YYYY-MM-DD), no time component
 * - "time"       — time-only (HH:MM:SS), no date component
 * - "json"       — arbitrary JSON object/array
 *
 * Semantic types (validated as strings but with format constraints):
 * - "email"     — RFC 5322 compliant email
 * - "url"       — well-formed URL (https/http)
 * - "uuid"      — UUIDv4 (auto-generated if not provided and default = "uuid()")
 * - "enum"      — must match one of `enumValues`
 *
 * Reference types:
 * - "reference"  — foreign key to another table's record, stored as string ID
 *
 * Special default expressions:
 * - "now()"     — set to current UTC timestamp (only valid for datetime/date)
 * - "uuid()"    — auto-generate UUIDv4 (only valid for uuid)
 */
export type ColumnType =
  | "string"
  | "text"
  | "integer"
  | "decimal"
  | "boolean"
  | "datetime"
  | "date"
  | "time"
  | "json"
  | "email"
  | "url"
  | "uuid"
  | "enum"
  | "reference";

export type ColumnDef = {
  name: string;
  type: ColumnType;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  maxLength?: number; // for string/text (max 65535)
  enumValues?: string[]; // for "enum" type
  referenceTable?: string; // for "reference" type — name of the referenced DataTable
  referenceCascade?: boolean; // for "reference" — delete this record when referenced record is deleted
  description?: string; // optional human-readable description shown in API docs
};

export type SchemaDefinition = {
  columns: ColumnDef[];
};

export const COLUMN_TYPE_INFO: Record<ColumnType, { label: string; description: string; supportsMaxLength: boolean; supportsEnum: boolean; supportsReference: boolean; supportsDefaultExpr: Array<"now" | "uuid"> }> = {
  string: { label: "متن کوتاه (string)", description: "رشته‌ی کوتاه، حداکثر ۲۵۶ کاراکتر (قابل تنظیم)", supportsMaxLength: true, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  text: { label: "متن طولانی (text)", description: "رشته‌ی بلند بدون محدودیت طول، برای توضیحات و محتوا", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  integer: { label: "عدد صحیح (integer)", description: "عدد صحیح مثبت یا منفی", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  decimal: { label: "عدد اعشاری (decimal)", description: "عدد اعشاری، برای قیمت‌ها و مقادیر دقیق", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  boolean: { label: "بولی (boolean)", description: "true یا false", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  datetime: { label: "تاریخ و زمان (datetime)", description: "ISO 8601 timestamp UTC", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: ["now"] },
  date: { label: "فقط تاریخ (date)", description: "فقط تاریخ، بدون زمان (YYYY-MM-DD)", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: ["now"] },
  time: { label: "فقط زمان (time)", description: "فقط زمان، بدون تاریخ (HH:MM:SS)", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  json: { label: "JSON (object)", description: "آبجکت یا آرایه JSON دلخواه", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  email: { label: "ایمیل (email)", description: "آدرس ایمیل معتبر (RFC 5322)", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  url: { label: "آدرس (url)", description: "URL معتبر (http یا https)", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: [] },
  uuid: { label: "UUID (uuid)", description: "شناسه‌ی یکتای UUIDv4 — می‌تونی خودکار بساز", supportsMaxLength: false, supportsEnum: false, supportsReference: false, supportsDefaultExpr: ["uuid"] },
  enum: { label: "مقادیر ثابت (enum)", description: "یکی از مقادیر از پیش تعیین‌شده", supportsMaxLength: false, supportsEnum: true, supportsReference: false, supportsDefaultExpr: [] },
  reference: { label: "ارجاع (reference)", description: "کلید خارجی به جدول دیگر", supportsMaxLength: false, supportsEnum: false, supportsReference: true, supportsDefaultExpr: [] },
};

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_RE = /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/[^\s]*)?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const schemaDefinitionSchema = z.object({
  columns: z
    .array(
      z.object({
        name: z.string().min(1).max(64).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "نام ستون نامعتبر"),
        type: z.enum([
          "string", "text", "integer", "decimal", "boolean",
          "datetime", "date", "time", "json",
          "email", "url", "uuid", "enum", "reference",
        ]),
        required: z.boolean().default(false),
        unique: z.boolean().default(false),
        default: z.unknown().optional(),
        maxLength: z.number().int().min(1).max(65535).optional(),
        enumValues: z.array(z.string().min(1).max(80)).max(50).optional(),
        referenceTable: z.string().max(64).optional(),
        referenceCascade: z.boolean().default(false),
        description: z.string().max(280).optional(),
      })
    )
    .max(40, "حداکثر ۴۰ ستون"),
});

export function validateSchema(input: unknown): { ok: true; schema: SchemaDefinition } | { ok: false; error: string } {
  try {
    const parsed = schemaDefinitionSchema.parse(input);
    // Cross-field validation
    for (const col of parsed.columns as ColumnDef[]) {
      // enum must have enumValues
      if (col.type === "enum" && (!col.enumValues || col.enumValues.length === 0)) {
        return { ok: false, error: `ستون ${col.name} از نوع enum است — حداقل یک مقدار لازم است` };
      }
      // reference must have referenceTable
      if (col.type === "reference" && !col.referenceTable) {
        return { ok: false, error: `ستون ${col.name} از نوع reference است — جدول مرجع مشخص کنید` };
      }
      // maxLength only on string/text
      if (col.maxLength && col.type !== "string" && col.type !== "text") {
        return { ok: false, error: `maxLength فقط برای string/text مجاز است` };
      }
    }
    return { ok: true, schema: parsed as SchemaDefinition };
  } catch (e) {
    const zErr = e as { errors?: Array<{ message: string }> };
    return { ok: false, error: zErr.errors?.[0]?.message ?? "اسکیمای نامعتبر" };
  }
}

/**
 * Validate a record payload against the table's schema.
 * Returns { ok: true, cleaned } or { ok: false, error }.
 */
export function validateRecord(
  schema: SchemaDefinition,
  payload: Record<string, unknown>,
  mode: "insert" | "update"
): { ok: true; data: Record<string, unknown> } | { ok: false, error: string } {
  const cleaned: Record<string, unknown> = {};
  for (const col of schema.columns) {
    const v = payload[col.name];
    if (mode === "insert") {
      if (v === undefined || v === null) {
        if (col.default !== undefined) {
          cleaned[col.name] = resolveDefault(col);
          continue;
        }
        if (col.required) return { ok: false, error: `ستون ${col.name} الزامی است` };
        continue;
      }
    } else {
      // update: only set if provided
      if (v === undefined) continue;
    }
    // Type check
    const validation = validateValue(col, v);
    if (!validation.ok) return { ok: false, error: validation.error };
    cleaned[col.name] = validation.value;
  }
  return { ok: true, data: cleaned };
}

/**
 * Resolve a default value, expanding "now()" and "uuid()" expressions.
 */
function resolveDefault(col: ColumnDef): unknown {
  const d = col.default;
  if (typeof d === "string") {
    if (d === "now()") {
      if (col.type === "datetime") return new Date().toISOString();
      if (col.type === "date") return new Date().toISOString().slice(0, 10);
      return d;
    }
    if (d === "uuid()") {
      if (col.type === "uuid") return crypto.randomUUID();
      return d;
    }
  }
  return d;
}

/**
 * Validate a single value against the column's type. Returns the (possibly
 * coerced) value or an error message.
 */
function validateValue(col: ColumnDef, v: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    switch (col.type) {
      case "string": {
        if (typeof v !== "string") return { ok: false, error: `${col.name} باید رشته باشد` };
        const max = col.maxLength ?? 256;
        if (v.length > max) return { ok: false, error: `${col.name} نباید بیش از ${max} کاراکتر باشد` };
        return { ok: true, value: v };
      }
      case "text": {
        if (typeof v !== "string") return { ok: false, error: `${col.name} باید رشته باشد` };
        const max = col.maxLength ?? 65535;
        if (v.length > max) return { ok: false, error: `${col.name} نباید بیش از ${max} کاراکتر باشد` };
        return { ok: true, value: v };
      }
      case "integer": {
        if (typeof v !== "number" || !Number.isInteger(v)) {
          // Try to coerce from string
          if (typeof v === "string" && /^-?\d+$/.test(v.trim())) {
            return { ok: true, value: Number(v) };
          }
          return { ok: false, error: `${col.name} باید عدد صحیح باشد` };
        }
        return { ok: true, value: v };
      }
      case "decimal": {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          if (typeof v === "string" && !Number.isNaN(Number(v))) {
            return { ok: true, value: Number(v) };
          }
          return { ok: false, error: `${col.name} باید عدد باشد` };
        }
        return { ok: true, value: v };
      }
      case "boolean": {
        if (typeof v === "boolean") return { ok: true, value: v };
        if (v === "true") return { ok: true, value: true };
        if (v === "false") return { ok: true, value: false };
        return { ok: false, error: `${col.name} باید بولی (true/false) باشد` };
      }
      case "datetime": {
        if (typeof v !== "string" && !(v instanceof Date)) return { ok: false, error: `${col.name} باید تاریخ باشد` };
        const d = typeof v === "string" ? new Date(v) : v;
        if (Number.isNaN(d.getTime())) return { ok: false, error: `${col.name} تاریخ نامعتبر است` };
        return { ok: true, value: d.toISOString() };
      }
      case "date": {
        if (typeof v !== "string") return { ok: false, error: `${col.name} باید رشته‌ی تاریخ YYYY-MM-DD باشد` };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: `${col.name} باید فرمت YYYY-MM-DD داشته باشد` };
        return { ok: true, value: v };
      }
      case "time": {
        if (typeof v !== "string") return { ok: false, error: `${col.name} باید رشته‌ی زمان باشد` };
        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(v)) return { ok: false, error: `${col.name} باید فرمت HH:MM یا HH:MM:SS داشته باشد` };
        return { ok: true, value: v };
      }
      case "json": {
        if (typeof v !== "object" || v === null) return { ok: false, error: `${col.name} باید آبجکت یا آرایه باشد` };
        return { ok: true, value: v };
      }
      case "email": {
        if (typeof v !== "string" || !EMAIL_RE.test(v)) {
          return { ok: false, error: `${col.name} باید ایمیل معتبر باشد` };
        }
        return { ok: true, value: v };
      }
      case "url": {
        if (typeof v !== "string" || !URL_RE.test(v)) {
          return { ok: false, error: `${col.name} باید URL معتبر (http/https) باشد` };
        }
        return { ok: true, value: v };
      }
      case "uuid": {
        if (typeof v !== "string" || !UUID_RE.test(v)) {
          return { ok: false, error: `${col.name} باید UUIDv4 معتبر باشد` };
        }
        return { ok: true, value: v };
      }
      case "enum": {
        if (typeof v !== "string") return { ok: false, error: `${col.name} باید یکی از مقادیر enum باشد` };
        if (!col.enumValues || !col.enumValues.includes(v)) {
          return { ok: false, error: `${col.name} باید یکی از این مقادیر باشد: ${col.enumValues?.join(", ")}` };
        }
        return { ok: true, value: v };
      }
      case "reference": {
        if (typeof v !== "string") return { ok: false, error: `${col.name} باید شناسه‌ی رکورد مرجع (string) باشد` };
        return { ok: true, value: v };
      }
    }
  } catch {
    return { ok: false, error: `${col.name} مقدار نامعتبر` };
  }
  return { ok: false, error: `${col.name} نوع ناشناخته` };
}

/**
 * Check if a data policy allows the operation. Simplified:
 * - "anonymous" => always allowed (no user needed)
 * - "authenticated" => requires a project user
 * - "service" => requires server_secret or admin credential
 * - "owner" => requires authenticated user AND record.ownerUserId == user.id
 *
 * Returns true if any matching enabled policy allows it.
 */
export type PolicySubject = "anonymous" | "authenticated" | "service" | "owner";
export type PolicyOperation = "select" | "insert" | "update" | "delete";

export function policyAllows(
  policies: Array<{ operation: string; subject: string; enabled: boolean }>,
  operation: PolicyOperation,
  options: { hasUser: boolean; isService: boolean; isOwner: boolean }
): boolean {
  for (const p of policies) {
    if (!p.enabled) continue;
    if (p.operation !== operation) continue;
    const subject = p.subject as PolicySubject;
    if (subject === "anonymous") return true;
    if (subject === "authenticated" && options.hasUser) return true;
    if (subject === "service" && options.isService) return true;
    if (subject === "owner" && options.hasUser && options.isOwner) return true;
  }
  return false;
}

/**
 * Generate a TypeScript-style type signature for a column. Used in API docs.
 */
export function columnTypeLabel(col: ColumnDef): string {
  switch (col.type) {
    case "string":
    case "text":
    case "email":
    case "url":
    case "uuid":
    case "reference":
      return col.type === "reference" ? `reference<${col.referenceTable ?? "?"}>` : "string";
    case "integer":
    case "decimal":
      return "number";
    case "boolean":
      return "boolean";
    case "datetime":
    case "date":
    case "time":
      return "string (ISO 8601)";
    case "json":
      return "object";
    case "enum":
      return col.enumValues?.map((v) => `"${v}"`).join(" | ") ?? "enum";
  }
}
