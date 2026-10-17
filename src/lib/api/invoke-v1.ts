import { NextRequest } from "next/server";
import { err } from "@/lib/api/response";
import { runWithDataPlaneOverride } from "@/lib/auth/data-plane-override";
import type { DataPlaneContext } from "@/lib/auth/project/data-plane";
import { POST as authLogin } from "@/app/api/v1/auth/login/route";
import { POST as authLogout } from "@/app/api/v1/auth/logout/route";
import { GET as authMe } from "@/app/api/v1/auth/me/route";
import { POST as passwordForgot } from "@/app/api/v1/auth/password/forgot/route";
import { POST as passwordReset } from "@/app/api/v1/auth/password/reset/route";
import { POST as authSignup } from "@/app/api/v1/auth/signup/route";
import { GET as billingProducts } from "@/app/api/v1/billing/products/route";
import { GET as billingPurchases } from "@/app/api/v1/billing/purchases/route";
import { POST as billingVerify } from "@/app/api/v1/billing/purchases/verify/route";
import { GET as billingSubscriptions } from "@/app/api/v1/billing/subscriptions/route";
import { POST as billingWebhook } from "@/app/api/v1/billing/webhooks/[provider]/route";
import { GET as dataList, POST as dataCreate } from "@/app/api/v1/data/[table]/route";
import {
  GET as dataGet,
  PATCH as dataPatch,
  DELETE as dataDelete,
} from "@/app/api/v1/data/[table]/[recordId]/route";

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> }
) => Promise<Response>;

type Match = { handler: Handler; params: Record<string, string> };

const STATIC: Record<string, Handler> = {
  "POST /auth/login": authLogin as Handler,
  "POST /auth/logout": authLogout as Handler,
  "GET /auth/me": authMe as Handler,
  "POST /auth/password/forgot": passwordForgot as Handler,
  "POST /auth/password/reset": passwordReset as Handler,
  "POST /auth/signup": authSignup as Handler,
  "GET /billing/products": billingProducts as Handler,
  "GET /billing/purchases": billingPurchases as Handler,
  "POST /billing/purchases/verify": billingVerify as Handler,
  "GET /billing/subscriptions": billingSubscriptions as Handler,
};

function matchRoute(method: string, pathname: string): Match | null {
  const exact = STATIC[`${method} ${pathname}`];
  if (exact) return { handler: exact, params: {} };

  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "billing" && parts[1] === "webhooks" && parts.length === 3 && method === "POST") {
    return { handler: billingWebhook as Handler, params: { provider: decodeURIComponent(parts[2]) } };
  }
  if (parts[0] === "data" && parts.length === 2 && (method === "GET" || method === "POST")) {
    const handler = method === "GET" ? dataList : dataCreate;
    return { handler: handler as Handler, params: { table: decodeURIComponent(parts[1]) } };
  }
  if (parts[0] === "data" && parts.length === 3 && (method === "GET" || method === "PATCH" || method === "DELETE")) {
    const handler = method === "GET" ? dataGet : method === "PATCH" ? dataPatch : dataDelete;
    return {
      handler: handler as Handler,
      params: {
        table: decodeURIComponent(parts[1]),
        recordId: decodeURIComponent(parts[2]),
      },
    };
  }
  return null;
}

export async function invokeDataPlane(input: {
  ctx: DataPlaneContext;
  method: string;
  path: string;
  body?: unknown;
  authorization?: string | null;
}): Promise<Response> {
  if (!input.path.startsWith("/") || input.path.includes("..") || input.path.includes("\\")) {
    return err("NOT_FOUND", "مسیر نامعتبر است.", 404);
  }

  let url: URL;
  try {
    url = new URL(input.path, "http://data-plane.internal");
  } catch {
    return err("NOT_FOUND", "مسیر نامعتبر است.", 404);
  }

  const method = input.method.toUpperCase();
  const matched = matchRoute(method, url.pathname);
  if (!matched) return err("NOT_FOUND", "endpoint یافت نشد.", 404);

  const headers = new Headers();
  if (input.authorization) headers.set("authorization", input.authorization);
  let body: string | undefined;
  if (input.body !== undefined && method !== "GET" && method !== "DELETE") {
    headers.set("content-type", "application/json");
    body = JSON.stringify(input.body);
  }

  const request = new NextRequest(url, { method, headers, body });
  return runWithDataPlaneOverride(
    { ctx: input.ctx, authorization: input.authorization ?? null },
    () => matched.handler(request, { params: Promise.resolve(matched.params) })
  );
}
