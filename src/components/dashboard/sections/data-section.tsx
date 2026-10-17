"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Plus, Trash2, Loader2, Network } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SectionLoading, EmptyState, EnvPicker, SectionHeader } from "@/components/dashboard/widgets/common";
import { StatusBadge } from "@/components/common/status-badge";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type DataTableRow = {
  id: string;
  name: string;
  displayName: string | null;
  schemaDefinition: { columns: Array<{ name: string; type: string; required?: boolean }> };
  status: string;
  environment: { id: string; name: string };
  recordsCount: number;
  policiesCount: number;
  createdAt: string;
};

export function DataSection({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("org");
  const [envId, setEnvId] = useState<string | null>(searchParams.get("env") ?? environments[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [creating, setCreating] = useState(false);

  function tableHref(tableId: string) {
    const params = new URLSearchParams();
    if (orgId) params.set("org", orgId);
    if (envId) params.set("env", envId);
    return `/dashboard/projects/${projectId}/tables/${tableId}?${params.toString()}`;
  }

  function schemaHref() {
    const params = new URLSearchParams();
    if (orgId) params.set("org", orgId);
    if (envId) params.set("env", envId);
    return `/dashboard/projects/${projectId}/schema?${params.toString()}`;
  }

  const { data, isLoading } = useQuery<{ tables: DataTableRow[] }>({
    queryKey: ["project-data-tables", projectId, envId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (envId) params.set("envId", envId);
      const r = await fetch(`/api/projects/${projectId}/data-tables?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { tables: json.data.tables };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleCreate() {
    if (creating) return;
    if (!envId) return toast.error("یک محیط انتخاب کنید");
    if (!newName.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) return toast.error("نام جدول نامعتبر (فقط حروف انگلیسی و _)");
    setCreating(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/data-tables`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environmentId: envId,
          name: newName,
          displayName: newDisplayName || undefined,
          schemaDefinition: { columns: [] },
        }),
      });
      const json = await r.json();
      if (!r.ok) return toast.error(json.error?.message ?? "خطا");
      toast.success("جدول ساخته شد");
      setCreateOpen(false);
      setNewName("");
      setNewDisplayName("");
      qc.invalidateQueries({ queryKey: ["project-data-tables", projectId, envId] });
      router.push(tableHref(json.data.table.id));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tableId: string) {
    const r = await fetch(`/api/projects/${projectId}/data-tables/${tableId}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json();
      return toast.error(j.error?.message ?? "خطا");
    }
    toast.success("جدول حذف شد");
    qc.invalidateQueries({ queryKey: ["project-data-tables", projectId, envId] });
  }

  const tables = data?.tables ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="پایگاه داده"
        description="جدول‌های داده با اسکیمای صریح و سیاست‌های دسترسی. API واقعی در /api/v1/data/{table}"
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => router.push(schemaHref())}>
              <Network className="size-4" /> نقشه جدول‌ها
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)} disabled={!envId}>
              <Plus className="size-4" /> جدول جدید
            </Button>
          </div>
        }
      />

      <EnvPicker environments={environments} value={envId} onChange={setEnvId} />

      {isLoading ? (
        <SectionLoading />
      ) : tables.length === 0 ? (
        <EmptyState
          icon={Database}
          title="جدولی وجود ندارد"
          description="یک جدول با اسکیمای صریح بسازید تا API و policyهای آن فعال شوند."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map((t) => (
            <Card
              key={t.id}
              className="bg-card/40 border-border/60 cursor-pointer hover:border-primary/40"
              onClick={() => router.push(tableHref(t.id))}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.displayName ?? "بدون نام نمایشی"}</div>
                  </div>
                  <StatusBadge value={t.status} />
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  {t.schemaDefinition.columns.length} ستون · {t.recordsCount} رکورد · {t.policiesCount} سیاست
                </div>
                <div className="space-y-1 mb-3">
                  {t.schemaDefinition.columns.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="text-foreground/70">{c.type}{c.required ? " *" : ""}</span>
                    </div>
                  ))}
                  {t.schemaDefinition.columns.length > 5 && (
                    <div className="text-xs text-muted-foreground">و {t.schemaDefinition.columns.length - 5} ستون دیگر…</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive text-xs gap-1"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(t.id);
                  }}
                >
                  <Trash2 className="size-3" /> حذف جدول
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ساخت جدول داده</DialogTitle>
            <DialogDescription>
              فقط نام را وارد کنید. فیلدها را در صفحه جدول، با کشیدن روی بوم، می‌سازید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="table-name">نام جدول (لاتین)</Label>
              <Input id="table-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثلاً: posts" className="mt-1.5 bg-card/40 font-mono" autoFocus />
            </div>
            <div>
              <Label htmlFor="table-display">نام نمایشی (اختیاری)</Label>
              <Input id="table-display" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="مثلاً: پست‌ها" className="mt-1.5 bg-card/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating || !newName} className="gap-2">
              {creating && <Loader2 className="size-4 animate-spin" />} ادامه و طراحی فیلدها
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
