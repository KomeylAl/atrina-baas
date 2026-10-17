"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus, Loader2, Hash, Calendar, Layers } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber, formatDateShort } from "@/lib/utils/format";
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
import { useState, useEffect } from "react";

type OrgWithProjects = {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
  createdAt: string;
  projects: Array<{ id: string; name: string; slug: string; status: string; createdAt: string }>;
};

export function OrganizationsView() {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery<{ organizations: OrgWithProjects[] }>({
    queryKey: ["organizations", "list"],
    queryFn: async () => {
      const r = await fetch("/api/organizations");
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message ?? "خطا");
      return { organizations: (json.data?.organizations ?? []) as OrgWithProjects[] };
    },
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
      const r = await fetch("/api/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await r.json();
      if (!r.ok) {
        toast.error(json.error?.message ?? "خطا در ساخت سازمان");
        return;
      }
      toast.success("سازمان ساخته شد 🎉");
      setCreateOpen(false);
      setNewName("");
      qc.invalidateQueries({ queryKey: ["organizations", "list"] });
      // refetch user to refresh membership list
      useAuth.getState().fetchUser();
    } finally {
      setCreating(false);
    }
  }

  const orgs = data?.organizations ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">سازمان‌های شما</h2>
          <p className="text-sm text-muted-foreground mt-1">
            سازمان‌هایی که عضو آن‌ها هستید و نقش شما در هر کدام
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" />
          سازمان جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto mb-2" />
          در حال بارگذاری…
        </div>
      ) : orgs.length === 0 ? (
        <Card className="bg-card/40">
          <CardContent className="p-10 text-center">
            <Building2 className="size-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-1">هنوز سازمانی ندارید</h3>
            <p className="text-sm text-muted-foreground mb-4">
              برای شروع، اولین سازمان خود را بسازید.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="size-4" />
              ساخت اولین سازمان
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <Card key={org.id} className="bg-card/40 border-border/60 hover:border-primary/40 transition-colors">
              <CardHeader className="flex-row items-start justify-between pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-lg brand-gradient/15 bg-primary/15 flex items-center justify-center text-primary font-bold shrink-0">
                    {org.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{org.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Hash className="size-3" />
                      {org.slug}
                    </CardDescription>
                  </div>
                </div>
                <StatusBadge value={org.status} />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="text-muted-foreground">
                    نقش شما: <StatusBadge value={org.role} className="mr-1" />
                  </div>
                  <div className="text-muted-foreground">{formatDateShort(org.createdAt)}</div>
                </div>
                <div className="border-t border-border/60 pt-3">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Layers className="size-3.5" />
                    {formatNumber(org.projects.length)} پروژه
                  </div>
                  {org.projects.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      {org.projects.slice(0, 3).map((p) => (
                        <li key={p.id} className="flex items-center justify-between">
                          <span className="truncate">{p.name}</span>
                          <StatusBadge value={p.status} />
                        </li>
                      ))}
                      {org.projects.length > 3 && (
                        <li className="text-muted-foreground">و {formatNumber(org.projects.length - 3)} مورد دیگر…</li>
                      )}
                    </ul>
                  ) : (
                    <div className="text-xs text-muted-foreground">پروژه‌ای وجود ندارد.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ساخت سازمان جدید</DialogTitle>
            <DialogDescription>
              یک سازمان برای همکاری تیمی روی پروژه‌ها بسازید. شما به‌عنوان مالک اضافه می‌شوید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="org-name">نام سازمان</Label>
              <Input
                id="org-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً: شرکت آترینا"
                className="mt-1.5 bg-card/40"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="size-4 animate-spin" />}
              ساخت سازمان
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
