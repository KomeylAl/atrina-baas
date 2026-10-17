"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { SectionLoading, EnvPicker, SectionHeader } from "@/components/dashboard/widgets/common";
import { formatNumber } from "@/lib/utils/format";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

type QuotaRow = {
  metric: string;
  label: string;
  unit: string;
  limit: number;
  current: number;
  remaining: number;
  custom: boolean;
};

const METRIC_FORMATTERS: Record<string, (n: number) => string> = {
  api_requests: (n) => formatNumber(n),
  storage_bytes: (n) => formatBytes(n),
  monthly_users: (n) => formatNumber(n),
  monthly_purchases: (n) => formatNumber(n),
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "۰";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${formatNumber(parseFloat((bytes / Math.pow(1024, i)).toFixed(2)))} ${units[i]}`;
}

export function QuotasSection({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const [envId, setEnvId] = useState<string | null>(environments[0]?.id ?? null);
  const [editingLimits, setEditingLimits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ quotas: QuotaRow[] }>({
    queryKey: ["project-quotas", projectId, envId],
    queryFn: async () => {
      if (!envId) return { quotas: [] };
      const r = await fetch(`/api/projects/${projectId}/quotas?envId=${envId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { quotas: json.data.quotas };
    },
    enabled: !!envId,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function saveLimit(metric: string) {
    if (!envId) return;
    const v = editingLimits[metric];
    if (v === undefined) return;
    const num = Number(v);
    if (!Number.isFinite(num) || num < 0) return toast.error("مقدار نامعتبر");
    setSaving(metric);
    try {
      const r = await fetch(`/api/projects/${projectId}/quotas`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ environmentId: envId, metric, limitValue: num }),
      });
      const j = await r.json();
      if (!r.ok) return toast.error(j.error?.message ?? "خطا");
      toast.success("سهمیه آپدیت شد");
      setEditingLimits((s) => { const ns = { ...s }; delete ns[metric]; return ns; });
      qc.invalidateQueries({ queryKey: ["project-quotas", projectId, envId] });
    } finally {
      setSaving(null);
    }
  }

  const quotas = data?.quotas ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="سهمیه‌ها و استفاده"
        description="محدودیت‌های هر محیط و میزان استفاده فعلی — همه فازها به این سهمیه‌ها احترام می‌گذارند"
      />

      <EnvPicker environments={environments} value={envId} onChange={setEnvId} />

      {!envId ? (
        <SectionLoading label="یک محیط انتخاب کنید" />
      ) : isLoading ? (
        <SectionLoading />
      ) : quotas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Gauge className="size-10 mx-auto mb-3" />
          <p>داده‌ای موجود نیست.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quotas.map((q) => {
            const pct = q.limit > 0 ? Math.min(100, Math.round((q.current / q.limit) * 100)) : 0;
            const fmt = METRIC_FORMATTERS[q.metric] ?? ((n: number) => formatNumber(n));
            return (
              <Card key={q.metric} className="bg-card/40 border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{q.label}</div>
                      <div className="text-xs text-muted-foreground font-mono">{q.metric}</div>
                    </div>
                    {q.custom && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">سفارشی</span>
                    )}
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {fmt(q.current)}
                    <span className="text-sm text-muted-foreground mx-1">/ {fmt(q.limit)}</span>
                  </div>
                  <div className="mb-3">
                    <Progress
                      value={pct}
                      className={`h-2 ${pct > 90 ? "[&>div]:bg-destructive" : pct > 70 ? "[&>div]:bg-warning" : "[&>div]:bg-primary"}`}
                    />
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                      <span>{pct}% استفاده</span>
                      <span>باقیمانده: {fmt(q.remaining)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editingLimits[q.metric] ?? q.limit}
                      onChange={(e) => setEditingLimits((s) => ({ ...s, [q.metric]: e.target.value }))}
                      className="bg-card/40 h-8 text-xs"
                      placeholder="مقدار جدید"
                    />
                    <Button size="sm" variant="outline" className="h-8 text-xs" disabled={saving === q.metric} onClick={() => saveLimit(q.metric)}>
                      {saving === q.metric && <Loader2 className="size-3 animate-spin ml-1" />}
                      ذخیره
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {quotas.length > 0 && quotas.some((q) => q.limit > 0 && q.current / q.limit > 0.9) && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
          <AlertTriangle className="size-4 text-warning" />
          <span>یکی از سهمیه‌ها نزدیک به حد مجاز است.</span>
        </div>
      )}
    </div>
  );
}
