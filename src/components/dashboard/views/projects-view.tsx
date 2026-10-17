"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Layers, Hash, KeyRound, Calendar, ArrowLeft, ChevronLeft } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateShort, formatNumber } from "@/lib/utils/format";
import { toast } from "sonner";
import { useAuth } from "@/stores/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import type { View } from "@/components/dashboard/dashboard-shell";

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  createdAt: string;
  environments: Array<{ id: string; name: string; slug: string; type: string; status: string }>;
  credentialsCount: number;
};

export function ProjectsView({
  activeOrgId,
  onNavigate,
}: {
  activeOrgId: string | null;
  onNavigate?: (v: View) => void;
}) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Determine which org to query — if none selected, fetch user's first
  const orgId = activeOrgId ?? user?.memberships[0]?.organization.id ?? null;

  const { data, isLoading } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects", "list", orgId],
    queryFn: async () => {
      if (!orgId) return { projects: [] as Project[] };
      const r = await fetch(`/api/organizations/${orgId}/projects`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message ?? "خطا در دریافت پروژه‌ها");
      return { projects: (json.data?.projects ?? []) as Project[] };
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleCreate() {
    if (creating) return;
    if (newName.trim().length < 2) {
      toast.error("نام باید حداقل ۲ کاراکتر باشد");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch(`/api/organizations/${orgId}/projects`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || undefined,
        }),
      });
      const json = await r.json();
      if (!r.ok) {
        toast.error(json.error?.message ?? "خطا در ساخت پروژه");
        return;
      }
      toast.success("پروژه ساخته شد 🎉");
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      qc.invalidateQueries({ queryKey: ["projects", "list", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    } finally {
      setCreating(false);
    }
  }

  const projects = data?.projects ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">پروژه‌ها</h2>
          <p className="text-sm text-muted-foreground mt-1">
            پروژه‌های سازمان فعلی — هر پروژه نمایانگر یک اپلیکیشن یا سرویس است.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={!orgId}>
          <Plus className="size-4" />
          پروژه جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          در حال بارگذاری…
        </div>
      ) : projects.length === 0 ? (
        <Card className="bg-card/40">
          <CardContent className="p-10 text-center">
            <Layers className="size-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-1">هنوز پروژه‌ای نساخته‌اید</h3>
            <p className="text-sm text-muted-foreground mb-4">
              اولین پروژه را برای شروع ساخت اپلیکیشن خود بسازید.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              ساخت اولین پروژه
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => onNavigate?.({ name: "project-detail", projectId: p.id })}
              className="text-right"
            >
              <Card className="bg-card/40 border-border/60 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 group h-full">
                <CardHeader className="flex-row items-start justify-between pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-11 rounded-lg bg-info/15 flex items-center justify-center text-info shrink-0">
                      <Layers className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                        {p.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Hash className="size-3" />
                        {p.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge value={p.status} />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                    {p.description ?? "بدون توضیحات"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-3">
                    <div>
                      <div className="text-muted-foreground mb-1">محیط‌ها</div>
                      <div className="font-medium flex items-center gap-1">
                        {formatNumber(p.environments.length)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">کلیدها</div>
                      <div className="font-medium flex items-center gap-1">
                        <KeyRound className="size-3" />
                        {formatNumber(p.credentialsCount)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3">
                    <Calendar className="size-3" />
                    {formatDateShort(p.createdAt)}
                  </div>
                  <div className="flex items-center justify-end mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    مشاهده جزئیات
                    <ChevronLeft className="size-3.5" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ساخت پروژه جدید</DialogTitle>
            <DialogDescription>
              پروژه‌ها به‌صورت خودکار با محیط‌های Development و Production شروع می‌شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="p-name">نام پروژه</Label>
              <Input
                id="p-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً: اپ موبایل آترینا"
                className="mt-1.5 bg-card/40"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="p-desc">توضیحات (اختیاری)</Label>
              <Textarea
                id="p-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="این پروژه چیست؟"
                className="mt-1.5 bg-card/40 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="size-4 animate-spin" />}
              ساخت پروژه
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
