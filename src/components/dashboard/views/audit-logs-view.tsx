"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { timeAgo, formatDateShort } from "@/lib/utils/format";

export function AuditLogsView() {
  const { data, isLoading } = useQuery({
    queryKey: ["all-audit"],
    queryFn: async () => {
      // Get all orgs the user is in, then fetch their projects, then fetch audit-logs for each project,
      // and merge with org-level audit (no separate endpoint, so we approximate via project audit logs).
      const orgsRes = await fetch("/api/organizations");
      const orgsJson = await orgsRes.json();
      const orgs = (orgsJson.data?.organizations ?? orgsJson.organizations ?? []) as Array<{ id: string }>;

      const all: Array<{
        id: string;
        action: string;
        actorType: string;
        actor: { email: string | null; displayName: string | null } | null;
        resourceType: string | null;
        resourceId: string | null;
        createdAt: string;
      }> = [];
      for (const o of orgs) {
        const projsRes = await fetch(`/api/organizations/${o.id}/projects`);
        const projsJson = await projsRes.json();
        const projects = (projsJson.data?.projects ?? projsJson.projects ?? []) as Array<{ id: string }>;
        for (const p of projects) {
          const r = await fetch(`/api/projects/${p.id}/audit-logs`);
          const j = await r.json();
          const logs = (j.data?.logs ?? []) as typeof all;
          all.push(...logs);
        }
      }
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { logs: all };
    },
  });

  const logs = data?.logs ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">گزارش‌های ممیزی</h2>
        <p className="text-sm text-muted-foreground mt-1">
          رویدادهای حساس در تمام پروژه‌ها — مرتب‌شده بر اساس زمان به ترتیب نزولی
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto" />
        </div>
      ) : logs.length === 0 ? (
        <Card className="bg-card/40">
          <CardContent className="p-10 text-center">
            <ShieldCheck className="size-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-1">هنوز رویدادی ثبت نشده</h3>
            <p className="text-sm text-muted-foreground">
              عملیات حساس (ورود، ساخت کلید، ساخت پروژه، ...) اینجا نمایش داده می‌شوند.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/40 border-border/60">
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {logs.slice(0, 100).map((log) => (
                <li key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-foreground">{log.action}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {log.actor?.email && <span>فعال: {log.actor.email}</span>}
                      {log.resourceType && <span>منبع: {log.resourceType}</span>}
                      <span>{formatDateShort(log.createdAt)}</span>
                      <span className="text-foreground">{timeAgo(log.createdAt)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
