"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users as UsersIcon, Search, Ban, Check, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SectionLoading, EmptyState, EnvPicker, SectionHeader } from "@/components/dashboard/widgets/common";
import { StatusBadge } from "@/components/common/status-badge";
import { timeAgo, formatDateShort } from "@/lib/utils/format";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type ProjectUserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  environment: { id: string; name: string; slug: string };
  sessionsCount: number;
  subscriptionsCount: number;
  purchasesCount: number;
};

export function UsersSection({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const [envId, setEnvId] = useState<string | null>(environments[0]?.id ?? null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<ProjectUserRow | null>(null);

  const { data, isLoading } = useQuery<{ users: ProjectUserRow[] }>({
    queryKey: ["project-users", projectId, envId, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (envId) params.set("envId", envId);
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const r = await fetch(`/api/projects/${projectId}/users?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message ?? "خطا");
      return { users: json.data.users };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function updateStatus(user: ProjectUserRow, newStatus: string) {
    const r = await fetch(`/api/projects/${projectId}/users?userId=${user.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await r.json();
    if (!r.ok) {
      toast.error(json.error?.message ?? "خطا");
      return;
    }
    toast.success("وضعیت کاربر آپدیت شد");
    qc.invalidateQueries({ queryKey: ["project-users", projectId, envId, search, statusFilter] });
  }

  async function revokeSessions(user: ProjectUserRow) {
    const r = await fetch(`/api/projects/${projectId}/users/${user.id}/revoke-sessions`, { method: "POST" });
    const json = await r.json();
    if (!r.ok) {
      toast.error(json.error?.message ?? "خطا");
      return;
    }
    toast.success(`${json.data.revoked} نشست ابطال شد`);
    qc.invalidateQueries({ queryKey: ["project-users", projectId, envId, search, statusFilter] });
  }

  const users = data?.users ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="کاربران پروژه"
        description="کاربران نهایی اپلیکیشن — مدیریت، جستجو، مسدودسازی و ابطال نشست‌ها"
      />

      <Card className="bg-card/40 border-border/60">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <EnvPicker environments={environments} value={envId} onChange={setEnvId} />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="جستجوی ایمیل…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 bg-card/40"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 bg-card/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="blocked">مسدود</SelectItem>
                <SelectItem value="pending">در انتظار</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <SectionLoading label="در حال بارگذاری کاربران…" />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="هیچ کاربری وجود ندارد"
          description="کاربران نهایی با SDK و کلید publishable ثبت‌نام می‌کنند و اینجا نمایش داده می‌شوند."
        />
      ) : (
        <Card className="bg-card/40 border-border/60">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="text-right px-4 py-3 font-medium">کاربر</th>
                  <th className="text-right px-4 py-3 font-medium">محیط</th>
                  <th className="text-right px-4 py-3 font-medium">آخرین ورود</th>
                  <th className="text-right px-4 py-3 font-medium">نشست‌ها</th>
                  <th className="text-right px-4 py-3 font-medium">اشتراک</th>
                  <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                  <th className="text-right px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.displayName ?? "بدون نام"}</div>
                      <div className="text-xs text-muted-foreground">{u.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{u.environment.name}</td>
                    <td className="px-4 py-3 text-xs">{u.lastSignInAt ? timeAgo(u.lastSignInAt) : "—"}</td>
                    <td className="px-4 py-3 text-xs">{u.sessionsCount}</td>
                    <td className="px-4 py-3 text-xs">{u.subscriptionsCount}</td>
                    <td className="px-4 py-3"><StatusBadge value={u.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {u.status === "active" ? (
                          <Button size="sm" variant="ghost" className="text-destructive gap-1 h-7 text-xs" onClick={() => updateStatus(u, "blocked")}>
                            <Ban className="size-3" /> مسدود
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-success gap-1 h-7 text-xs" onClick={() => updateStatus(u, "active")}>
                            <Check className="size-3" /> فعال
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => revokeSessions(u)}>
                          <KeyRound className="size-3" /> ابطال نشست‌ها
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
