"use client";

import { AtrinaWordmark } from "@/components/common/brand";
import {
  Boxes,
  Building2,
  Layers,
  KeyRound,
  ShieldCheck,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/stores/auth-store";
import type { View } from "@/components/dashboard/dashboard-shell";
import { useState } from "react";

const NAV_ITEMS = [
  { id: "overview", label: "نمای کلی", icon: Boxes },
  { id: "organizations", label: "سازمان‌ها", icon: Building2 },
  { id: "projects", label: "پروژه‌ها", icon: Layers },
  { id: "credentials", label: "کلیدهای API", icon: KeyRound },
  { id: "sdk-center", label: "مرکز SDK", icon: Package },
  { id: "audit-logs", label: "ممیزی", icon: ShieldCheck },
  { id: "usage", label: "استفاده", icon: Activity },
  { id: "settings", label: "تنظیمات", icon: Settings },
] as const;

export function Sidebar({
  view,
  onNavigate,
  activeOrgId,
  onSelectOrg,
  onLogout,
}: {
  view: View;
  onNavigate: (v: View) => void;
  activeOrgId: string | null;
  onSelectOrg: (id: string) => void;
  onLogout: () => void;
}) {
  const user = useAuth((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;
  const activeMembership = user.memberships.find(
    (m) => m.organization.id === activeOrgId
  );

  return (
    <aside
      className={cn(
        "w-64 shrink-0 h-full overflow-hidden flex flex-col bg-sidebar text-sidebar-foreground border-l border-sidebar-border",
        mobileOpen ? "block" : "hidden md:flex"
      )}
    >
      <div className="h-16 px-5 flex items-center justify-between border-b border-sidebar-border">
        <AtrinaWordmark />
      </div>

      {/* Organization switcher */}
      <div className="px-3 py-3 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-sidebar-border bg-card/40 hover:bg-sidebar-accent transition-colors text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-8 rounded-md brand-gradient/15 bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {activeMembership ? activeMembership.organization.name.charAt(0) : "?"}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="truncate font-medium">
                    {activeMembership?.organization.name ?? "بدون سازمان"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {activeMembership?.role ?? "—"}
                  </div>
                </div>
              </div>
              <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>سازمان‌های شما</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user.memberships.map((m) => (
              <DropdownMenuItem
                key={m.organization.id}
                onClick={() => onSelectOrg(m.organization.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>{m.organization.name}</span>
                  <span className="text-[10px] text-muted-foreground">{m.role}</span>
                </div>
              </DropdownMenuItem>
            ))}
            {user.memberships.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3">
                هنوز عضو سازمان‌ی نیستید.
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = view.name === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate({ name: item.id } as View)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User block */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="size-9 rounded-full brand-gradient flex items-center justify-center text-sm font-bold text-white shrink-0">
            {user.displayName?.charAt(0) ?? user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium">
              {user.displayName ?? "بدون نام"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          className="w-full mt-1 justify-start gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-4" />
          خروج
        </Button>
      </div>
    </aside>
  );
}
