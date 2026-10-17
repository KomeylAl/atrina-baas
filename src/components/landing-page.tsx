"use client";

import {
  AtrinaWordmark,
  AtrinaLogo,
} from "@/components/common/brand";
import {
  ArrowLeft,
  Boxes,
  Building2,
  Database,
  KeyRound,
  Layers,
  ShieldCheck,
  Sparkles,
  Terminal,
  Webhook,
  Zap,
  Server,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingPage({
  onGetStarted,
  onLogin,
  signedIn = false,
}: {
  onGetStarted: () => void;
  onLogin: () => void;
  signedIn?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <AtrinaWordmark />
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">امکانات</a>
            <a href="#modules" className="hover:text-foreground transition-colors">ماژول‌ها</a>
            <a href="#security" className="hover:text-foreground transition-colors">امنیت</a>
            <Link href="/docs" className="hover:text-foreground transition-colors">مستندات</Link>
            <a href="#roadmap" className="hover:text-foreground transition-colors">نقشه راه</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="md:hidden" asChild>
              <Link href="/docs">مستندات</Link>
            </Button>
            <ThemeToggle />
            {signedIn ? (
              <Button size="sm" asChild className="gap-1.5">
                <Link href="/dashboard">
                  داشبورد
                  <ArrowLeft className="size-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={onLogin}>
                  ورود
                </Button>
                <Button size="sm" onClick={onGetStarted} className="gap-1.5">
                  شروع کنید
                  <ArrowLeft className="size-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" aria-hidden />
        <div
          className="absolute -top-40 right-1/3 size-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.25 295) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div
          className="absolute top-32 -left-40 size-[420px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.65 0.22 320) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur-sm text-xs text-muted-foreground mb-6">
              <Sparkles className="size-3.5 text-primary" />
              نسخه ۰.۱ — فاز ۰+۱
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15]">
              بک‌اند به‌عنوان سرویس
              <br />
              برای اپلیکیشن‌های <span className="brand-text-gradient">آترینا</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              یک پلتفرم چند-پروژه‌ای برای ساخت و مدیریت اپ‌های موبایل، وب و SaaS.
              احراز هویت، ذخیره‌سازی، احراز خرید، نوتیفیکیشن و کلیدهای API —
              همه از یک داشبورد، با امنیت و انزوای کامل tenant‌ها.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {signedIn ? (
                <Button size="lg" asChild className="gap-2 h-12 px-6">
                  <Link href="/dashboard">
                    رفتن به داشبورد
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={onGetStarted} className="gap-2 h-12 px-6">
                    شروع رایگان
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={onLogin} className="h-12 px-6">
                    ورود به داشبورد
                  </Button>
                </>
              )}
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-success" />
                انزوای کامل tenant‌ها
              </div>
              <div className="flex items-center gap-1.5">
                <KeyRound className="size-4 text-primary" />
                کلیدهای API با چرخش امن
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="size-4 text-info" />
                ممیزی کامل عملیات
              </div>
            </div>
          </motion.div>

          {/* Hero card mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative max-w-4xl"
          >
            <div className="glass-panel rounded-2xl border border-border/60 overflow-hidden shadow-2xl glow-violet">
              <div className="border-b border-border/60 px-4 py-3 flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-destructive/70" />
                <div className="size-2.5 rounded-full bg-warning/70" />
                <div className="size-2.5 rounded-full bg-success/70" />
                <div className="text-xs text-muted-foreground mx-2">app.atrina.io/dashboard</div>
              </div>
              <div className="grid grid-cols-12 min-h-[320px]">
                <div className="col-span-4 border-l border-border/60 p-3 space-y-1 text-xs">
                  {[
                    { label: "نمای کلی", icon: Boxes, active: true },
                    { label: "سازمان‌ها", icon: Building2 },
                    { label: "پروژه‌ها", icon: Layers },
                    { label: "کلیدهای API", icon: KeyRound },
                    { label: "ممیزی", icon: ShieldCheck },
                    { label: "استفاده", icon: Activity },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${
                        item.active ? "bg-primary/15 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <item.icon className="size-3.5" />
                      {item.label}
                    </div>
                  ))}
                </div>
                <div className="col-span-8 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">پروژه فعلی</div>
                      <div className="text-sm font-semibold">اپ موبایل آترینا</div>
                    </div>
                    <div className="text-[10px] px-2 py-0.5 rounded-full border border-success/30 bg-success/10 text-success">
                      فعال
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "درخواست‌ها", value: "۱۲۴K" },
                      { label: "کاربران فعال", value: "۸٫۲K" },
                      { label: "خطاها", value: "۰٫۲٪" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg border border-border/60 p-2.5 bg-card/40">
                        <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                        <div className="text-sm font-bold mt-0.5">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-border/60 p-3 bg-card/40">
                    <div className="text-[10px] text-muted-foreground mb-1.5">رویدادهای اخیر</div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span>احراز هویت موفق</span>
                        <span className="text-muted-foreground">همین حالا</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>کلید API چرخش یافت</span>
                        <span className="text-muted-foreground">۲ دقیقه پیش</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>محیط جدید ساخته شد</span>
                        <span className="text-muted-foreground">۵ دقیقه پیش</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">یک بک‌اند، همه‌چیز آماده</h2>
            <p className="text-muted-foreground">
              به‌جای ساخت بک‌اند از صفر برای هر اپ، Atrina BaaS یک پلتفرم کامل با ماژول‌های
              قابل فعال‌سازی در هر محیط ارائه می‌دهد. هر چیزی که برای راه‌اندازی یک
              اپلیکیشن موبایل یا وب نیاز دارید، آماده و قابل مدیریت است.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "احراز هویت چند-مود", desc: "ایمیل/رمز، OTP، جلسات و چرخش توکن — کنترل کامل از داخل پنل.", icon: ShieldCheck },
              { title: "مدیریت پروژه و محیط", desc: "برای هر اپ، محیط‌های توسعه، پیش‌تولید و تولید با ایزولاسیون کامل.", icon: Layers },
              { title: "کلیدهای API امن", desc: "publishable / server / admin — نمایش یک‌بار، چرخش و ابطال با کلیک.", icon: KeyRound },
              { title: "پایگاه داده", desc: "مدیریت منابع داده با اعتبارسنجی و کنترل دسترسی ردیفی.", icon: Database },
              { title: "اتصال وب‌هوک", desc: "وب‌هوک‌های خروجی با امضا، چرخش secret و مدیریت تلاش مجدد.", icon: Webhook },
              { title: "ممیزی و استفاده", desc: "هر عمل حساس ثبت می‌شود؛ آمار استفاده به‌صورت زنده قابل دیدن.", icon: Activity },
            ].map((f) => (
              <div
                key={f.title}
                className="glass-panel rounded-xl p-5 border border-border/50 hover:border-primary/40 transition-colors"
              >
                <div className="size-10 rounded-lg brand-gradient/15 bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="border-t border-border py-20 bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold mb-4">معماری دو-لایه</h2>
            <p className="text-muted-foreground">
              پلتفرم از دو صفحه منطقی تشکیل شده: <span className="text-foreground font-medium">Control Plane</span> برای مدیریت
              سازمان‌ها و پروژه‌ها، و <span className="text-foreground font-medium">Data Plane</span> برای سرویس‌دهی به اپ‌ها
              در زمان اجرا — هر دو با مرزهای مجوز شفاف.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Control plane */}
            <div className="glass-panel rounded-2xl border border-border/60 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Building2 className="size-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Control Plane</h3>
                    <p className="text-xs text-muted-foreground">مدیریت پلتفرم</p>
                  </div>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary">
                  داشبورد
                </div>
              </div>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: "سازمان‌ها و اعضا", icon: Building2 },
                  { label: "پروژه‌ها و محیط‌ها", icon: Layers },
                  { label: "فعال‌سازی ماژول‌ها", icon: Boxes },
                  { label: "کلیدهای API و چرخش", icon: KeyRound },
                  { label: "ممیزی و کنترل دسترسی", icon: ShieldCheck },
                ].map((i) => (
                  <li key={i.label} className="flex items-center gap-3 text-muted-foreground">
                    <i.icon className="size-4 text-primary/80 shrink-0" />
                    {i.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Data plane */}
            <div className="glass-panel rounded-2xl border border-border/60 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="size-10 rounded-lg bg-info/15 flex items-center justify-center">
                    <Server className="size-5 text-info" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Data Plane</h3>
                    <p className="text-xs text-muted-foreground">سرویس‌های runtime</p>
                  </div>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full border border-info/30 bg-info/10 text-info">
                  API
                </div>
              </div>
              <ul className="space-y-2.5 text-sm">
                {[
                  { label: "احراز هویت کاربران پروژه", icon: ShieldCheck },
                  { label: "مدیریت داده و نشست‌ها", icon: Database },
                  { label: "احراز خرید و اشتراک", icon: Zap },
                  { label: "ذخیره‌سازی شیء (S3-compatible)", icon: Boxes },
                  { label: "وب‌هوک و نوتیفیکیشن", icon: Webhook },
                ].map((i) => (
                  <li key={i.label} className="flex items-center gap-3 text-muted-foreground">
                    <i.icon className="size-4 text-info/80 shrink-0" />
                    {i.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="border-t border-border py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">امنیت، نه یک افزونه</h2>
              <p className="text-muted-foreground leading-relaxed">
                هر درخواست، ابتدا اعتبار کلید را چک می‌کند، سپس محیط و پروژه را از
                کلید استخراج می‌کند، و در نهایت مجوز عملیات را به‌صورت سمت-سرور
                اعمال می‌کند. هیچ‌وقت به شناسه‌ای که کلاینت می‌فرستد اعتماد نمی‌شود.
                عملیات مخرب بین tenant‌ها با تست‌های خودکار چک می‌شوند.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  { label: "Default-Deny", icon: ShieldCheck },
                  { label: "Row-Level Scoping", icon: Database },
                  { label: "Hash شده توکن‌ها", icon: KeyRound },
                  { label: "Audit روی عملیات حساس", icon: Activity },
                ].map((i) => (
                  <div key={i.label} className="flex items-center gap-2.5 text-sm">
                    <i.icon className="size-4 text-primary" />
                    {i.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-panel rounded-2xl border border-border/60 p-6 font-mono text-xs space-y-1.5 leading-relaxed">
              <Line text="// نمونه‌ای از جریان اعتبارسنجی" muted />
              <Line text={`const credential = await verifyKey(req.headers.Authorization);`} />
              <Line text={`if (!credential) return deny();`} muted />
              <Line text={`const env = await resolveEnv(credential.environmentId);`} />
              <Line text={`if (!isAuthorized(credential, env, "data:read")) return deny();`} muted />
              <Line text={`const result = await queryData(env, ctx, { safe: true });`} />
              <Line text={`return ok(result);`} muted />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="roadmap" className="border-t border-border py-20 bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto">
            <AtrinaLogo size={56} className="mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-3">{signedIn ? "برگردید به کار" : "آماده شروع هستید؟"}</h2>
            <p className="text-muted-foreground mb-8">
              {signedIn
                ? "حساب شما باز است. از داشبورد پروژه‌ها، جدول‌ها و کلیدها را ادامه دهید."
                : "همین حالا حساب بسازید و اولین پروژه خود را در کمتر از یک دقیقه راه‌اندازی کنید."}
            </p>
            <div className="flex justify-center gap-3">
              {signedIn ? (
                <Button size="lg" asChild className="h-12 px-6 gap-2">
                  <Link href="/dashboard">
                    داشبورد
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" onClick={onGetStarted} className="h-12 px-6 gap-2">
                    شروع کنید — رایگان
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={onLogin} className="h-12 px-6">
                    ورود
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <AtrinaLogo size={20} />
            <span>© {new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(new Date())} Atrina. تمامی حقوق محفوظ است.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link className="hover:text-foreground transition-colors" href="/docs">مستندات</Link>
            <a className="hover:text-foreground transition-colors" href="#">سیاست حریم خصوصی</a>
            <a className="hover:text-foreground transition-colors" href="#">تماس</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Line({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <div className={muted ? "text-muted-foreground" : "text-foreground"}>
      {text}
    </div>
  );
}
