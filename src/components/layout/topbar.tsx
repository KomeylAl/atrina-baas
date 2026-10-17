"use client";

import { Boxes, Building2, Layers, KeyRound, ShieldCheck, Activity, Settings, Search, Package } from "lucide-react";
import type { View } from "@/components/dashboard/dashboard-shell";
import { useAuth } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

const TITLES: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
  overview: { title: "نمای کلی", subtitle: "وضعیت پلتفرم و آمار کلی شما", icon: Boxes },
  organizations: { title: "سازمان‌ها", subtitle: "سازمان‌هایی که عضو آن‌ها هستید", icon: Building2 },
  projects: { title: "پروژه‌ها", subtitle: "همه پروژه‌های سازمان فعلی", icon: Layers },
  "project-detail": { title: "جزئیات پروژه", subtitle: "محیط‌ها، کلیدها و آمار", icon: Layers },
  credentials: { title: "کلیدهای API", subtitle: "مدیریت کلیدهای publishable و server", icon: KeyRound },
  "sdk-center": { title: "مرکز SDK", subtitle: "SDK رسمی برای موبایل و وب", icon: Package },
  "audit-logs": { title: "گزارش‌های ممیزی", subtitle: "تاریخچه عملیات حساس", icon: ShieldCheck },
  usage: { title: "استفاده", subtitle: "آمار درخواست‌ها و رویدادها", icon: Activity },
  settings: { title: "تنظیمات", subtitle: "حساب کاربری و ترجیحات", icon: Settings },
};

export function Topbar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const user = useAuth((s) => s.user);
  const key = view.name === "project-detail" ? "project-detail" : view.name;
  const meta = TITLES[key] ?? TITLES.overview;
  const Icon = meta.icon;

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-semibold text-base truncate">{meta.title}</h1>
          <p className="text-xs text-muted-foreground truncate">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="hidden md:block relative">
          <Search className="size-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="جستجو…"
            className="w-64 pr-9 bg-card/40"
          />
        </div>
        {user && (
          <div className="hidden sm:block text-xs text-muted-foreground">
            {user.email}
          </div>
        )}
      </div>
    </header>
  );
}
