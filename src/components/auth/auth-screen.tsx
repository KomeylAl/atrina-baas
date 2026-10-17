"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/stores/auth-store";
import { AtrinaLogo } from "@/components/common/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Mail, User2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

type Mode = "login" | "signup";

export function AuthScreen({
  initialMode,
  onSwitch,
  onBackHome,
}: {
  initialMode: Mode;
  onSwitch: (mode: Mode) => void;
  onBackHome: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Keep `mode` in sync with parent's initialMode if it changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const login = useAuth((s) => s.login);
  const signup = useAuth((s) => s.signup);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "login") {
        const r = await login(email.trim(), password);
        if (!r.ok) {
          toast.error(r.error ?? "ورود ناموفق بود");
        } else {
          toast.success("خوش آمدید! 😊");
          router.push("/dashboard");
        }
      } else {
        const r = await signup({
          email: email.trim(),
          password,
          displayName: displayName.trim() || undefined,
          organizationName: organizationName.trim() || undefined,
        });
        if (!r.ok) {
          toast.error(r.error ?? "ثبت‌نام ناموفق بود");
        } else {
          toast.success("حساب شما ساخته شد. خوش آمدید!");
          router.push("/dashboard");
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col bg-background relative">
        {/* Decorative background */}
        <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
        <div
          className="absolute -top-20 -right-20 size-[360px] rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.25 295) 0%, transparent 70%)" }}
        />

        <div className="relative p-6 sm:p-10 flex items-start justify-between">
          <button
            onClick={onBackHome}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-1.5"
          >
            <ArrowRight className="size-4" />
            بازگشت به خانه
          </button>
          <ThemeToggle />
        </div>

        <div className="relative flex-1 flex items-center justify-center px-6">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="flex items-center justify-center mb-8">
              <AtrinaLogo size={56} />
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">
              {mode === "login" ? "ورود به حساب" : "ساخت حساب جدید"}
            </h1>
            <p className="text-muted-foreground text-center text-sm mb-8">
              {mode === "login"
                ? "برای دسترسی به داشبورد Atrina BaaS وارد شوید."
                : "در کمتر از یک دقیقه اولین پروژه‌تان را بسازید."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <Field
                  icon={<User2 className="size-4" />}
                  label="نام نمایشی (اختیاری)"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="مثلاً: علی رضایی"
                  autoComplete="name"
                />
              )}
              <Field
                icon={<Mail className="size-4" />}
                label="ایمیل"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <div>
                <Label htmlFor="password">رمز عبور</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "••••••••" : "حداقل ۸ کاراکتر"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    className="pl-10 bg-card/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPwd ? "پنهان کردن رمز" : "نمایش رمز"}
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              {mode === "signup" && (
                <Field
                  icon={<Building2 className="size-4" />}
                  label="نام سازمان (اختیاری)"
                  value={organizationName}
                  onChange={setOrganizationName}
                  placeholder="مثلاً: شرکت آترینا"
                />
              )}

              <Button
                type="submit"
                disabled={submitting}
                size="lg"
                className="w-full gap-2 mt-2"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {mode === "login" ? "ورود" : "ساخت حساب"}
                {!submitting && <ArrowLeft className="size-4" />}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              یا
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Quick demo login */}
            {mode === "login" && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => {
                  setEmail("demo@atrina.io");
                  setPassword("atrina123");
                  setMode("login");
                }}
              >
                استفاده از حساب دمو
              </Button>
            )}

            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === "login" ? "حساب ندارید؟" : "قبلاً حساب دارید؟"}{" "}
              <button
                type="button"
                onClick={() => onSwitch(mode === "login" ? "signup" : "login")}
                className="text-primary hover:underline font-medium"
              >
                {mode === "login" ? "ساخت حساب" : "ورود"}
              </button>
            </p>
          </motion.div>
        </div>
      </div>

      {/* Visual side */}
      <div className="hidden lg:flex relative overflow-hidden bg-card/30 border-r border-border">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.18 0.02 290) 0%, oklch(0.22 0.05 295) 100%)",
          }}
        />
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div
          className="absolute -top-40 -left-40 size-[420px] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.25 295) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-20 right-20 size-[320px] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.22 320) 0%, transparent 70%)" }}
        />
        <div className="relative flex flex-col justify-end p-12 text-foreground">
          <motion.blockquote
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="max-w-md"
          >
            <p className="text-2xl font-medium leading-relaxed">
              «هر اپلیکیشن، یک بک‌اند پخته لازم دارد.
              ما بک‌اند را می‌سازیم تا شما روی محصول تمرکز کنید.»
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="size-10 rounded-full brand-gradient" />
              <div>
                <div className="font-semibold">تیم Atrina BaaS</div>
                <div className="text-sm text-muted-foreground">مهندسی پلتفرم</div>
              </div>
            </div>
          </motion.blockquote>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  icon,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  autoComplete?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative mt-1.5">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className={icon ? "pr-10 bg-card/40" : "bg-card/40"}
        />
      </div>
    </div>
  );
}
