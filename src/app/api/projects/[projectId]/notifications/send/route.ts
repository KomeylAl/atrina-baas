import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { resolveProjectForUser } from "@/lib/auth/authorization";
import { rejectRole } from "@/lib/auth/roles";
import { getProvider, type NotificationChannel } from "@/lib/notifications/providers";
import { err, ok } from "@/lib/api/response";
import { z } from "zod";

const schema = z.object({
  environmentId: z.string().min(1),
  channel: z.enum(["sms", "email", "push"]),
  templateCode: z.string().optional(),
  recipient: z.string().min(1).max(256),
  variables: z.record(z.unknown()).default({}),
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
    parsed = schema.parse(await req.json());
  } catch (e) {
    const zErr = e as { errors?: Array<{ path: string[]; message: string }> };
    return err("VALIDATION_ERROR", zErr.errors?.[0]?.message ?? "ورودی نامعتبر", 422);
  }

  // Find template (optional)
  let template = null;
  if (parsed.templateCode) {
    template = await db.notificationTemplate.findUnique({
      where: {
        projectId_environmentId_channel_code: {
          projectId,
          environmentId: parsed.environmentId,
          channel: parsed.channel,
          code: parsed.templateCode,
        },
      },
    });
    if (!template) return err("TEMPLATE_NOT_FOUND", "قالب یافت نشد.", 404);
  }

  // Render body with variables (simple {{key}} substitution)
  const body = template ? renderTemplate(template.body, parsed.variables) : `شما یک پیام جدید دارید. (manual send)`;
  const subject = template ? (template.subject ?? undefined) : undefined;

  const provider = getProvider(parsed.channel as NotificationChannel);
  const result = await provider.send({
    to: parsed.recipient,
    body,
    subject,
    channel: parsed.channel as NotificationChannel,
    templateCode: parsed.templateCode,
  });

  const log = await db.notificationLog.create({
    data: {
      projectId,
      environmentId: parsed.environmentId,
      channel: parsed.channel,
      provider: provider.name,
      templateCode: parsed.templateCode ?? null,
      recipient: parsed.recipient,
      recipientUserId: null,
      status: result.ok ? "sent" : "failed",
      attempts: 1,
      providerMessageId: result.providerMessageId ?? null,
      errorMessage: result.errorMessage ?? null,
      sentAt: result.ok ? new Date() : null,
    },
  });
  return ok({ log });
}

function renderTemplate(tpl: string, vars: Record<string, unknown>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`));
}
