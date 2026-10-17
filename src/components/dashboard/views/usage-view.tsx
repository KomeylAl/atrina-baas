"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Activity } from "lucide-react";
import { formatNumber } from "@/lib/utils/format";

export function UsageView() {
  const { data, isLoading } = useQuery({
    queryKey: ["all-usage"],
    queryFn: async () => {
      const orgsRes = await fetch("/api/organizations");
      const orgsJson = await orgsRes.json();
      const orgs = (orgsJson.data?.organizations ?? orgsJson.organizations ?? []) as Array<{ id: string }>;
      const byMetric: Record<string, number> = {};
      const byProject: Array<{ name: string; total: number }> = [];
      for (const o of orgs) {
        const projsRes = await fetch(`/api/organizations/${o.id}/projects`);
        const projsJson = await projsRes.json();
        const projects = (projsJson.data?.projects ?? projsJson.projects ?? []) as Array<{ id: string; name: string }>;
        for (const p of projects) {
          const r = await fetch(`/api/projects/${p.id}/usage`);
          const j = await r.json();
          const byM = j.data?.byMetric ?? {};
          let total = 0;
          for (const [k, v] of Object.entries(byM)) {
            byMetric[k] = (byMetric[k] ?? 0) + (v as number);
            total += v as number;
          }
          if (total > 0) byProject.push({ name: p.name, total });
        }
      }
      byProject.sort((a, b) => b.total - a.total);
      return { byMetric, byProject };
    },
  });

  const metrics = Object.entries(data?.byMetric ?? {});
  const maxMetric = Math.max(...metrics.map(([, v]) => v), 1);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">آمار استفاده</h2>
        <p className="text-sm text-muted-foreground mt-1">
          آمار کل عملیات API در ۳۰ روز اخیر، تفکیک شده بر اساس متریک
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto" />
        </div>
      ) : metrics.length === 0 ? (
        <Card className="bg-card/40">
          <CardContent className="p-10 text-center">
            <Activity className="size-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-1">داده‌ای موجود نیست</h3>
            <p className="text-sm text-muted-foreground">
              به‌محض اینکه API‌ها شروع به دریافت ترافیک کنند، آمار اینجا نمایش داده می‌شود.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map(([metric, total]) => (
              <Card key={metric} className="bg-card/40 border-border/60">
                <CardContent className="p-5">
                  <div className="text-xs text-muted-foreground mb-1 font-mono">{metric}</div>
                  <div className="text-3xl font-bold">{formatNumber(total)}</div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full brand-gradient transition-all"
                      style={{ width: `${(total / maxMetric) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-card/40 border-border/60">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-4">تفکیک بر اساس پروژه</h3>
              <div className="space-y-3">
                {data?.byProject.map((p) => {
                  const max = Math.max(...(data?.byProject.map((x) => x.total) ?? [1]), 1);
                  return (
                    <div key={p.name} className="flex items-center gap-4">
                      <div className="w-40 truncate text-sm">{p.name}</div>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full brand-gradient"
                          style={{ width: `${(p.total / max) * 100}%` }}
                        />
                      </div>
                      <div className="text-sm font-medium w-20 text-start" dir="ltr">{formatNumber(p.total)}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
