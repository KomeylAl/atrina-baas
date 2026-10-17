"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/stores/auth-store";
import { StatusBadge } from "@/components/common/status-badge";
import { ShieldCheck, User2, Mail, Building2, LogOut } from "lucide-react";

export function SettingsView() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">تنظیمات</h2>
        <p className="text-sm text-muted-foreground mt-1">
          مدیریت حساب کاربری و ترجیحات
        </p>
      </div>

      {/* Profile */}
      <Card className="bg-card/40 border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User2 className="size-4 text-primary" />
            پروفایل کاربری
          </CardTitle>
          <CardDescription>اطلاعات پایه‌ای حساب شما</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="نام نمایشی" value={user.displayName ?? "—"} icon={<User2 className="size-4" />} />
          <Row label="ایمیل" value={user.email} icon={<Mail className="size-4" />} />
          <Row label="وضعیت" value={<StatusBadge value={user.status} />} icon={<ShieldCheck className="size-4" />} />
        </CardContent>
      </Card>

      {/* Organizations */}
      <Card className="bg-card/40 border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            عضویت در سازمان‌ها
          </CardTitle>
          <CardDescription>سازمان‌هایی که عضو آن‌ها هستید</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {user.memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز عضو سازمان‌ی نیستید.</p>
          ) : (
            user.memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card/40">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold">
                    {m.organization.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{m.organization.name}</div>
                    <div className="text-xs text-muted-foreground">{m.organization.slug}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={m.role} />
                  <StatusBadge value={m.status} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <div className="font-medium text-base">خروج از حساب</div>
            <p className="text-sm text-muted-foreground">جلسه فعلی شما پایان می‌یابد.</p>
          </div>
          <Button variant="destructive" onClick={() => logout()} className="gap-2">
            <LogOut className="size-4" />
            خروج
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card/40">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
