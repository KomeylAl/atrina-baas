import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { listBillingProviders, CAPABILITY_MATRIX } from "@/lib/billing/providers";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

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
  const where: Record<string, unknown> = {};
  if (envId) where.environmentId = envId;
  else where.environment = { projectId };

  const providers = await db.billingProvider.findMany({
    where,
    include: { environment: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return ok({
    providers: providers.map((p) => ({
      id: p.id,
      provider: p.provider,
      displayName: p.displayName,
      status: p.status,
      environment: p.environment,
      createdAt: p.createdAt,
    })),
    available: listBillingProviders(),
    capabilities: CAPABILITY_MATRIX,
  });
}

const createSchema = z.object({
  environmentId: z.string().min(1),
  provider: z.enum(["cafebazaar", "myket"]),
  displayName: z.string().min(2).max(80),
  configuration: z.record(z.unknown()).default({}),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const user = await requireUser();
  const { projectId } = await params;
  const ctx = await resolveProjectForUser(user, projectId);
  if (!ctx) return err("NOT_FOUND", "پروژه یافت نشد.", 404);
  const denied = rejectRole(ctx.role, "write");
  if (denied) return denied;
  let parsed;
  try {
    parsed = createSchema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }
  const env = await db.environment.findUnique({ where: { id: parsed.environmentId } });
  if (!env || env.projectId !== projectId) return err("NOT_FOUND", "محیط یافت نشد.", 404);

  // Mock encryption: in a real impl, encrypt with the application key.
  const configurationEnc = Buffer.from(JSON.stringify(parsed.configuration)).toString("base64");
  const provider = await db.billingProvider.create({
    data: {
      environmentId: env.id,
      provider: parsed.provider,
      displayName: parsed.displayName,
      status: "active",
      configurationEnc,
    },
  });
  return ok({ provider });
}
