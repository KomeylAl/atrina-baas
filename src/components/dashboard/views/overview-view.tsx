"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Layers, KeyRound, Activity, ShieldCheck, ArrowLeft, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/auth-store";
import { formatNumber, timeAgo, toPersianDigits } from "@/lib/utils/format";
import { StatusBadge } from "@/components/common/status-badge";
import type { View } from "@/components/dashboard/dashboard-shell";

type OverviewData = {
  stats: { orgs: number; projects: number; environments: number; credentials: number; auditLogs: number };
  recentLogs: Array<{ id: string; action: string; resourceType: string | null; actorEmail: string | null; createdAt: string }>;
};

export function OverviewView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/overview");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "خطا");
      return json.data as OverviewData;
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Provide defaults if data is undefined (initial fetch in flight)
  const stats = data?.stats ?? { orgs: 0, projects: 0, environments: 0, credentials: 0, auditLogs: 0 };
  const recentLogs = data?.recentLogs ?? [];

  const statCards = [
    { label: "سازمان‌ها", value: stats.orgs, icon: Building2, color: "text-primary" },
    { label: "پروژه‌ها", value: stats.projects, icon: Layers, color: "text-info" },
    { label: "محیط‌ها", value: stats.environments, icon: Sparkles, color: "text-success" },
    { label: "کلیدهای فعال", value: stats.credentials, icon: KeyRound, color: "text-warning" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hero */}
      <div className="glass-panel rounded-2xl p-6 border border-border/60 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 size-[280px] rounded-full opacity-25 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.55 0.25 295) 0%, transparent 70%)" }} />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              سلام، {user?.displayName ?? user?.email?.split("@")[0]} 👋
            </div>
            <h1 className="text-2xl font-bold">
              خوش آمدید به <span className="brand-text-gradient">Atrina BaaS</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
              برای شروع، یک پروژه بسازید، محیط‌های آن را تنظیم کنید و اولین کلید API خود را صادر کنید.
              همه ابزارهای لازم برای ساخت اپلیکیشن موبایل، وب یا SaaS شما همین‌جا آماده است.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={() => onNavigate({ name: "projects" })} className="gap-2">
              <Layers className="size-4" />
              پروزه‌ها
            </Button>
            <Button variant="outline" onClick={() => onNavigate({ name: "audit-logs" })} className="gap-2">
              <ShieldCheck className="size-4" />
              گزارش‌ها
            </Button>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <Card key={s.label} className="bg-card/40 border-border/60">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-3xl font-bold tracking-tight">
                    {isLoading ? "—" : formatNumber(s.value)}
                  </div>
                </div>
                <div className={`size-9 rounded-lg bg-muted/30 flex items-center justify-center ${s.color}`}>
                  <s.icon className="size-5" />
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="size-3 text-success" />
                داده‌های واقعی از دیتابیس
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two columns: recent activity + quickstart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent activity */}
        <Card className="lg:col-span-2 bg-card/40 border-border/60">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">رویدادهای اخیر</CardTitle>
              <CardDescription className="text-xs">آخرین فعالیت‌های حساب شما</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate({ name: "audit-logs" })} className="gap-1 text-xs">
              همه
              <ArrowLeft className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-border/60">
              {recentLogs.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? "در حال بارگذاری…" : "هنوز هیچ رویدادی ثبت نشده است."}
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recentLogs.map((log) => (
                    <li key={log.id} className="px-6 py-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Activity className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{log.action}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {log.actorEmail ?? "system"} · {log.resourceType ?? "—"}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {timeAgo(log.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quickstart */}
        <Card className="bg-card/40 border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">شروع سریع</CardTitle>
            <CardDescription className="text-xs">چه‌کار بعدی باید انجام دهید</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { title: "ایجاد پروژه جدید", desc: "اولین پروژه‌ی خود را بسازید", onClick: () => onNavigate({ name: "projects" }) },
              { title: "ایجاد محیط", desc: "محیط dev یا prod برای پروژه", onClick: () => onNavigate({ name: "projects" }) },
              { title: "صدور کلید API", desc: "publishable یا server key", onClick: () => onNavigate({ name: "credentials" }) },
              { title: "بازدید از گزارش‌ها", desc: "اطلاع از رویدادهای حساس", onClick: () => onNavigate({ name: "audit-logs" }) },
            ].map((step, idx) => (
              <button
                key={idx}
                onClick={step.onClick}
                className="w-full text-right p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                      {toPersianDigits(idx + 1)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{step.title}</div>
                      <div className="text-xs text-muted-foreground">{step.desc}</div>
                    </div>
                  </div>
                  <ArrowLeft className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
