import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { err, ok } from "@/lib/api/response";
import { columnTypeLabel } from "@/lib/data/schema";

/**
 * GET /api/projects/{projectId}/api-reference
 *
 * Returns a complete list of all API endpoints available for this project,
 * grouped by category. Includes:
 * - Auth endpoints (signup, login, etc.)
 * - Data API endpoints (one set per data table)
 * - Billing endpoints
 * - Storage endpoints
 * - Notification endpoints (admin)
 * - Webhook endpoints (admin)
 *
 * Each endpoint includes method, path (with the user's actual base URL),
 * description, request schema (params/body), and response schema.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);

  const url = new URL(req.url);
  const envId = url.searchParams.get("envId");
  const envs = await db.environment.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  const env = envId ? envs.find((e) => e.id === envId) : envs[0];
  if (!env) return err("BAD_REQUEST", "محیط یافت نشد.", 400);

  // Fetch data tables for this env (used to generate dynamic endpoints)
  const tables = await db.dataTable.findMany({
    where: { environmentId: env.id, status: "active" },
    include: { policies: true },
    orderBy: { name: "asc" },
  });

  // Get the base URL the user would use to call the API.
  // In production, this is the same host as the dashboard, with /api/v1/ prefix.
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const baseUrl = `${proto}://${host}/api/v1`;

  // Get a sample publishable key prefix for examples
  const cred = await db.apiCredential.findFirst({
    where: { environmentId: env.id, kind: "publishable", status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const endpoints = buildEndpoints(baseUrl, tables);

  return ok({
    baseUrl,
    env: { id: env.id, name: env.name, slug: env.slug, type: env.type },
    environments: envs.map((e) => ({ id: e.id, name: e.name, slug: e.slug, type: e.type })),
    publishableKeyPrefix: cred?.keyPrefix ?? "(یک کلید publishable بسازید)",
    endpoints,
  });
}

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  category: string;
  title: string;
  description: string;
  auth: "publishable" | "user" | "server" | "none";
  pathParams?: Array<{ name: string; description: string }>;
  queryParams?: Array<{ name: string; type: string; description: string }>;
  bodySchema?: string; // human-readable schema description
  responseSchema?: string;
  exampleResponse?: string; // pretty JSON example
  tryable?: boolean; // whether the user can call this from the dashboard playground
};

function buildEndpoints(baseUrl: string, tables: Array<{ name: string; displayName: string | null; schemaDefinition: string; policies: Array<{ operation: string; subject: string; enabled: boolean }> }>): Endpoint[] {
  const eps: Endpoint[] = [];

  // ===== Auth =====
  eps.push({
    method: "POST",
    path: "/auth/signup",
    category: "احراز هویت",
    title: "ثبت‌نام کاربر",
    description: "یک کاربر نهایی در پروژه/محیط فعلی ایجاد می‌کند و نشست برمی‌گرداند.",
    auth: "publishable",
    bodySchema: `{
  "email": "string (ایمیل معتبر)",
  "password": "string (حداقل ۸ کاراکتر)",
  "displayName": "string (اختیاری، حداکثر ۸۰)"
}`,
    responseSchema: `{
  "ok": true,
  "data": {
    "user": { "id": "string", "email": "string", "displayName": "string|null" },
    "token": "string (نشست — در header Authorization: Bearer استفاده کنید)"
  }
}`,
    exampleResponse: `{
  "ok": true,
  "data": {
    "user": { "id": "u_abc123", "email": "alice@example.com", "displayName": "آلیس" },
    "token": "abc.def.ghi"
  }
}`,
    tryable: true,
  });

  eps.push({
    method: "POST",
    path: "/auth/login",
    category: "احراز هویت",
    title: "ورود کاربر",
    description: "نشست جدید برای کاربر نهایی می‌سازد. نرخ: حداکثر ۱۰ درخواست در دقیقه.",
    auth: "publishable",
    bodySchema: `{
  "email": "string",
  "password": "string"
}`,
    responseSchema: `{
  "ok": true,
  "data": {
    "user": { ... },
    "token": "string"
  }
}`,
    tryable: true,
  });

  eps.push({
    method: "POST",
    path: "/auth/logout",
    category: "احراز هویت",
    title: "خروج",
    description: "نشست فعلی کاربر را ابطال می‌کند.",
    auth: "user",
    tryable: true,
  });

  eps.push({
    method: "GET",
    path: "/auth/me",
    category: "احراز هویت",
    title: "کاربر فعلی",
    description: "اطلاعات کاربر احراز‌شده فعلی را برمی‌گرداند.",
    auth: "user",
    responseSchema: `{
  "ok": true,
  "data": {
    "user": { "id": "string", "email": "string", "displayName": "string|null", "status": "string" }
  }
}`,
    tryable: true,
  });

  eps.push({
    method: "POST",
    path: "/auth/password/forgot",
    category: "احراز هویت",
    title: "فراموشی رمز",
    description: "درخواست بازنشانی رمز عبور (در پیاده‌سازی واقعی، ایمیل/پیامک ارسال می‌شود).",
    auth: "publishable",
    bodySchema: `{ "email": "string" }`,
  });

  eps.push({
    method: "POST",
    path: "/auth/password/reset",
    category: "احراز هویت",
    title: "بازنشانی رمز",
    description: "رمز جدید را با token بازنشانی اعمال می‌کند و همه‌ی نشست‌ها را ابطال می‌کند.",
    auth: "publishable",
    bodySchema: `{
  "email": "string",
  "newPassword": "string (حداقل ۸)",
  "resetToken": "string"
}`,
  });

  // ===== Data API: dynamic per table =====
  for (const table of tables) {
    const schema = JSON.parse(table.schemaDefinition) as SchemaDefinition;
    const cols = schema.columns ?? [];

    eps.push({
      method: "GET",
      path: `/data/${table.name}`,
      category: `داده — ${table.displayName ?? table.name}`,
      title: "لیست رکوردها",
      description: `همه‌ی رکوردهای جدول ${table.name} را (با pagination) برمی‌گرداند.`,
      auth: "user",
      queryParams: [
        { name: "page", type: "number", description: "شماره‌ی صفحه (پیش‌فرض: 1)" },
        { name: "pageSize", type: "number", description: "تعداد رکورد در صفحه (پیش‌فرض: 20، حداکثر 100)" },
      ],
      responseSchema: `{
  "ok": true,
  "data": {
    "records": [ { "id": "string", "data": { ...columns }, "ownerUserId": "string|null", "createdAt": "ISO", "updatedAt": "ISO" } ],
    "total": "number",
    "page": "number",
    "pageSize": "number"
  }
}`,
      tryable: true,
    });

    eps.push({
      method: "POST",
      path: `/data/${table.name}`,
      category: `داده — ${table.displayName ?? table.name}`,
      title: "ساخت رکورد جدید",
      description: `یک رکورد جدید در جدول ${table.name} ایجاد می‌کند. ownerUserId به‌صورت خودکار از کاربر احراز‌شده set می‌شود.`,
      auth: "user",
      bodySchema: buildBodySchema(cols),
      responseSchema: `{
  "ok": true,
  "data": {
    "record": { "id": "string", "data": { ...columns }, "ownerUserId": "string|null", "createdAt": "ISO" }
  }
}`,
      tryable: true,
    });

    eps.push({
      method: "GET",
      path: `/data/${table.name}/{recordId}`,
      category: `داده — ${table.displayName ?? table.name}`,
      title: "دریافت یک رکورد",
      description: `یک رکورد از جدول ${table.name} با شناسه.`,
      auth: "user",
      pathParams: [{ name: "recordId", description: "شناسه‌ی رکورد" }],
      tryable: true,
    });

    eps.push({
      method: "PATCH",
      path: `/data/${table.name}/{recordId}`,
      category: `داده — ${table.displayName ?? table.name}`,
      title: "ویرایش رکورد",
      description: `فیلدهای رکورد را آپدیت می‌کند. فقط فیلدهای ارسالی تغییر می‌کنند.`,
      auth: "user",
      pathParams: [{ name: "recordId", description: "شناسه‌ی رکورد" }],
      bodySchema: buildBodySchema(cols, true),
      tryable: true,
    });

    eps.push({
      method: "DELETE",
      path: `/data/${table.name}/{recordId}`,
      category: `داده — ${table.displayName ?? table.name}`,
      title: "حذف رکورد",
      description: `یک رکورد را حذف می‌کند. نیاز به مالک بودن رکورد (یا کلید سرور).`,
      auth: "user",
      pathParams: [{ name: "recordId", description: "شناسه‌ی رکورد" }],
      tryable: true,
    });
  }

  // ===== Billing =====
  eps.push({
    method: "GET",
    path: "/billing/products",
    category: "صورتحساب",
    title: "لیست محصولات و طرح‌ها",
    description: "همه‌ی محصولات فعال پروژه با طرح‌ها و entitlement‌هایشان.",
    auth: "publishable",
  });
  eps.push({
    method: "POST",
    path: "/billing/purchases/verify",
    category: "صورتحساب",
    title: "احراز خرید",
    description: "خرید را از طریق فروشگاه (CafeBazaar/Myket) احراز می‌کند و اشتراک/entitlement می‌سازد. Idempotent.",
    auth: "user",
    bodySchema: `{
  "planId": "string",
  "purchaseToken": "string (از SDK فروشگاه)",
  "storeProductId": "string",
  "provider": "cafebazaar | myket"
}`,
  });
  eps.push({
    method: "GET",
    path: "/billing/subscriptions",
    category: "صورتحساب",
    title: "اشتراک‌های کاربر",
    description: "اشتراک‌های فعلی کاربر و entitlement‌های فعال او.",
    auth: "user",
  });
  eps.push({
    method: "GET",
    path: "/billing/entitlements",
    category: "صورتحساب",
    title: "Entitlement‌ها",
    description: "فقط entitlement‌های فعال کاربر.",
    auth: "user",
  });

  // ===== Storage =====
  eps.push({
    method: "POST",
    path: "/storage/upload",
    category: "ذخیره‌سازی",
    title: "آپلود فایل",
    description: "فایل را در storage محیط آپلود می‌کند. حداکثر ۱۰MB. نرخ: ۳۰ در دقیقه.",
    auth: "user",
    bodySchema: `multipart/form-data:
  file: <binary>`,
    responseSchema: `{
  "ok": true,
  "data": {
    "object": { "id": "string", "key": "string", "fileName": "string", "contentType": "string", "size": "number" }
  }
}`,
    tryable: true,
  });
  eps.push({
    method: "GET",
    path: "/storage/download/{key}",
    category: "ذخیره‌سازی",
    title: "دانلود فایل",
    description: "محتوای فایل را با Content-Type مناسب برمی‌گرداند.",
    auth: "publishable",
    pathParams: [{ name: "key", description: "کلید آبجکت (از پاسخ upload)" }],
  });

  // ===== Notification (admin, no user auth) =====
  // These are dashboard endpoints, not data plane, so they're not listed here.

  return eps;
}

type SchemaDefinition = {
  columns: Array<{
    name: string;
    type: string;
    required?: boolean;
    default?: unknown;
    description?: string;
  }>;
};

function buildBodySchema(cols: SchemaDefinition["columns"], partial = false): string {
  const lines: string[] = ["{"];
  for (const c of cols) {
    const optional = !c.required || partial;
    const typeStr = columnTypeLabel(c as ColumnDefForLabel);
    const descSuffix = c.description ? ` // ${c.description}` : "";
    lines.push(`  "${c.name}": ${typeStr}${optional ? " (اختیاری)" : ""}${descSuffix}`);
  }
  lines.push("}");
  return lines.join("\n");
}

type ColumnDefForLabel = {
  name: string;
  type: string;
  enumValues?: string[];
  referenceTable?: string;
};
