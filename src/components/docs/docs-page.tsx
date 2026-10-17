"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Boxes,
  Check,
  Copy,
  Database,
  KeyRound,
  Layers,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { AtrinaWordmark } from "@/components/common/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const SECTIONS = [
  { id: "intro", label: "معرفی" },
  { id: "model", label: "سازمان، پروژه، محیط" },
  { id: "start", label: "شروع کار" },
  { id: "roles", label: "نقش‌ها" },
  { id: "data", label: "جدول‌ها" },
  { id: "api", label: "فراخوانی API" },
  { id: "users", label: "کاربران نهایی" },
  { id: "keys", label: "کلیدها و امنیت" },
  { id: "modules", label: "بقیه ماژول‌ها" },
  { id: "reference", label: "مرجع و SDK" },
] as const;

export function DocsPage() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const nodes = SECTIONS.map((section) => document.getElementById(section.id)).filter(
      (node): node is HTMLElement => !!node,
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.15, 0.4, 0.7] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/" className="shrink-0">
            <AtrinaWordmark />
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-border">/</span>
            <span className="text-foreground">مستندات</span>
          </div>
          <div className="flex-1" />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/?view=login">ورود</Link>
          </Button>
          <Button size="sm" asChild className="gap-1.5">
            <Link href="/?view=signup">
              شروع کنید
              <ArrowLeft className="size-3.5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-bg opacity-40" aria-hidden />
        <div
          className="absolute -top-24 right-1/4 size-[420px] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.25 295) 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 text-xs text-muted-foreground mb-5">
            <BookOpen className="size-3.5 text-primary" />
            راهنمای محصول
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight max-w-3xl leading-[1.2]">
            Atrina چطور کار می‌کند
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            از ساخت سازمان تا ذخیره رکورد در اپ. این صفحه مسیر داشبورد، مدل داده و API عمومی را همان‌طور که در محصول پیاده شده توضیح می‌دهد.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="lg:hidden -mx-4 px-4 mb-8 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                  active === section.id
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1 text-sm">
              <div className="text-[11px] font-medium text-muted-foreground mb-3">در این صفحه</div>
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`block rounded-lg px-3 py-1.5 transition-colors ${
                    active === section.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl space-y-16">
            <Section id="intro" title="معرفی">
              <p>
                Atrina یک بک‌اند چندپروژه‌ای است. تیم شما از داشبورد محصول را پیکربندی می‌کند و اپ موبایل یا وب از API عمومی همان محیط داده می‌خواند و می‌نویسد.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Concept
                  icon={Boxes}
                  title="صفحه کنترل"
                  text="سازمان، پروژه، محیط، کلید، جدول، سیاست دسترسی، صورتحساب، فایل، اعلان، وب‌هوک و سهمیه از داشبورد مدیریت می‌شوند."
                />
                <Concept
                  icon={Terminal}
                  title="صفحه داده"
                  text="درخواست‌های اپ به /api/v1 می‌روند. محیط از روی کلید مشخص می‌شود و شناسه‌ای که کلاینت بفرستد ملاک نیست."
                />
              </div>
              <Callout>
                پاسخ موفق شکل {"{ ok: true, data }"} دارد. خطا {"{ ok: false, error: { code, message } }"} برمی‌گرداند.
              </Callout>
            </Section>

            <Section id="model" title="سازمان، پروژه، محیط">
              <p>هر چیزی زیر یک سازمان است. عضو سازمان به پروژه‌های آن دسترسی دارد و داده هرگز بین پروژه‌ها قاطی نمی‌شود.</p>
              <ol className="space-y-3">
                <Step n="۱" title="سازمان">
                  حساب، اعضا و نقش‌ها اینجاست. یک نفر می‌تواند عضو چند سازمان باشد و از منوی کناری بین آن‌ها جابه‌جا شود.
                </Step>
                <Step n="۲" title="پروژه">
                  واحد محصول است: اپ موبایل، پنل یا سرویس. تب‌های پروژه محیط، کاربر، داده، صورتحساب، فایل، اعلان، وب‌هوک، سهمیه، مرجع API، ممیزی و استفاده را جدا می‌کنند.
                </Step>
                <Step n="۳" title="محیط">
                  هر پروژه با دو محیط Development و Production ساخته می‌شود. Staging و محیط سفارشی را هم می‌توان اضافه کرد. جدول، کاربر نهایی، کلید و فایل به محیط وصل‌اند، نه به کل پروژه.
                </Step>
              </ol>
            </Section>

            <Section id="start" title="شروع کار">
              <p>این مسیر را یک بار طی کنید تا اولین رکورد از API خوانده شود.</p>
              <ol className="space-y-3">
                <Step n="۱" title="حساب داشبورد">
                  از صفحه اصلی ثبت‌نام کنید. این حساب برای تیم شماست و با کاربر نهایی اپ فرق دارد.
                </Step>
                <Step n="۲" title="سازمان و پروژه">
                  اگر سازمانی ندارید یکی بسازید، بعد پروژه را داخل همان سازمان ایجاد کنید.
                </Step>
                <Step n="۳" title="کلید محیط">
                  در محیط Development یک کلید publishable بسازید. مقدار کامل کلید فقط همان لحظه نشان داده می‌شود؛ بعد از آن فقط پیشوند می‌ماند.
                </Step>
                <Step n="۴" title="جدول">
                  در تب داده، نام لاتین جدول را وارد کنید. بعد از ساخت، صفحه طراحی فیلد باز می‌شود.
                </Step>
                <Step n="۵" title="اولین درخواست">
                  کلید را در هدر <Code>x-atrina-key</Code> بگذارید و به <Code>/api/v1/data/{"{table}"}</Code> درخواست بزنید.
                </Step>
              </ol>
            </Section>

            <Section id="roles" title="نقش‌های داشبورد">
              <p>نقش روی عضویت سازمان است و روی کارهایی که در پروژه مجاز است اثر می‌گذارد.</p>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-start font-medium px-3 py-2">نقش</th>
                      <th className="text-start font-medium px-3 py-2">می‌تواند</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row role="owner و admin" text="همه‌چیز، از جمله ساخت و چرخش و ابطال کلید و تنظیم سهمیه." />
                    <Row role="developer" text="جدول، رکورد، محیط و بقیه تغییرات محصول. کلید را نمی‌سازد و ابطال نمی‌کند." />
                    <Row role="billing" text="مشاهده، آزمایش API از داخل داشبورد و لغو اشتراک. ساختار داده را عوض نمی‌کند." />
                    <Row role="viewer" text="فقط مشاهده. هیچ تغییری ثبت نمی‌کند." />
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="data" title="جدول‌ها">
              <p>
                جدول یک اسکیمای صریح است، نه یک سند آزاد. نام API لاتین است و با حرف یا زیرخط شروع می‌شود. اگر جدول رکورد داشته باشد، نام API قفل می‌شود تا کلاینت‌های قبلی نشکنند.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Concept
                  icon={Layers}
                  title="صفحه جدول"
                  text="نوع فیلد را از فهرست کنار بکشید روی بوم. ترتیب، اجبار، یکتایی، مقدار ثابت، کلید خارجی، پیش‌فرض و توضیح را همان‌جا تنظیم و ذخیره کنید."
                />
                <Concept
                  icon={Database}
                  title="نقشه جدول‌ها"
                  text="همه جدول‌های یک محیط را با فیلدها و خط کلید خارجی نشان می‌دهد. کارت را جابه‌جا کنید، فیلد را ویرایش کنید و یک‌جا ذخیره کنید."
                />
              </div>
              <p>نوع‌های فیلد این‌ها هستند:</p>
              <p className="font-mono text-xs leading-7 text-muted-foreground" dir="ltr">
                string, text, integer, decimal, boolean, datetime, date, time, json, email, url, uuid, enum, reference
              </p>
              <p>
                جدول تازه این سیاست‌ها را دارد: خواندن و درج برای کاربر واردشده، ویرایش و حذف برای مالک رکورد، و خواندن برای کلید سرویس. موضوع سیاست یکی از anonymous، authenticated، owner یا service است. اگر سیاست فعالی برای عمل نباشد، درخواست رد می‌شود.
              </p>
              <Callout>
                کلید خارجی نام جدول مقصد را نگه می‌دارد. در نقشه، خط از فیلد reference به همان جدول کشیده می‌شود.
              </Callout>
            </Section>

            <Section id="api" title="فراخوانی API">
              <p>
                پایه آدرس <Code>/api/v1</Code> است. کلید را در <Code>x-atrina-key</Code> بفرستید. نشست کاربر نهایی جداست و با <Code>Authorization: Bearer</Code> می‌آید.
              </p>
              <CodeBlock
                label="ساخت رکورد"
                code={`curl -X POST 'https://your-host/api/v1/data/posts' \\
  -H 'Content-Type: application/json' \\
  -H 'x-atrina-key: atr_pk_development_...' \\
  -H 'Authorization: Bearer <user-token>' \\
  -d '{"title":"سلام","status":"draft"}'`}
              />
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="text-start font-medium px-3 py-2">عمل</th>
                      <th className="text-start font-medium px-3 py-2">درخواست</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Row role="لیست" text="GET /api/v1/data/{table}?page=1&pageSize=20" />
                    <Row role="فیلتر" text='GET ...?filter={"status":"published"} برابری روی فیلد jsonb' />
                    <Row role="ساخت" text="POST /api/v1/data/{table} با بدنه فیلدها" />
                    <Row role="یک رکورد" text="GET /api/v1/data/{table}/{recordId}" />
                    <Row role="ویرایش" text="PATCH همان مسیر؛ فقط فیلدهای ارسالی عوض می‌شوند" />
                    <Row role="حذف" text="DELETE همان مسیر" />
                  </tbody>
                </table>
              </div>
              <p>
                pageSize حداکثر ۱۰۰ است. فیلتر باید یک شیء JSON با مقدار رشته، عدد یا بولین باشد. لیست رکوردها برای هر کلید حدود ۱۰۰ درخواست در دقیقه سقف دارد و سهمیه api_requests هم اعمال می‌شود.
              </p>
            </Section>

            <Section id="users" title="کاربران نهایی">
              <p>
                کاربر اپ داخل پروژه و محیط ساخته می‌شود. ثبت‌نام و ورود فقط با کلید publishable مجاز است. توکن نشست را برای درخواست‌های بعدی کنار همان کلید بفرستید.
              </p>
              <CodeBlock
                label="ورود کاربر اپ"
                code={`curl -X POST 'https://your-host/api/v1/auth/login' \\
  -H 'Content-Type: application/json' \\
  -H 'x-atrina-key: atr_pk_development_...' \\
  -d '{"email":"alice@example.com","password":"..."}'`}
              />
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Code>POST /api/v1/auth/signup</Code> ایمیل، رمز حداقل ۸ نویسه و نام نمایشی اختیاری.</li>
                <li><Code>POST /api/v1/auth/login</Code> حداکثر ۱۰ بار در دقیقه برای هر کلید.</li>
                <li><Code>GET /api/v1/auth/me</Code> و <Code>POST /api/v1/auth/logout</Code> با نشست کاربر.</li>
                <li><Code>POST /api/v1/auth/password/forgot</Code> و <Code>POST /api/v1/auth/password/reset</Code> برای بازنشانی رمز.</li>
              </ul>
              <p>
                هنگام ساخت رکورد، مالک از کاربر واردشده پر می‌شود. اگر سیاست جدول فقط owner باشد، هر کاربر رکوردهای خودش را می‌بیند.
              </p>
            </Section>

            <Section id="keys" title="کلیدها و امنیت">
              <p>سه نوع کلید وجود دارد. مقدار خام بعد از ساخت ذخیره نمی‌شود؛ فقط درهم SHA-256 آن برای تطبیق بعدی نگه داشته می‌شود.</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Concept icon={KeyRound} title="publishable" text="atr_pk_… برای اپ. ثبت‌نام و ورود کاربر با همین نوع است." />
                <Concept icon={ShieldCheck} title="server" text="atr_sk_… فقط روی سرور شما. سیاست‌هایی با موضوع service با این کلید مجاز می‌شوند." />
                <Concept icon={KeyRound} title="admin" text="atr_adm_… برای عملیات مدیریتی همان محیط. مثل کلید سرور، سرویس محسوب می‌شود." />
              </div>
              <p>
                شکل کلید <Code>atr_&lt;pk|sk|adm&gt;_&lt;slug-محیط&gt;_&lt;بخش تصادفی&gt;</Code> است. پیدا کردن کلید با هش یکتا انجام می‌شود، بعد نوع و اسلاگ محیط باید با همان کلید جور باشد. کلید ابطال‌شده یا محیط غیرفعال درخواست را رد می‌کند.
              </p>
              <Callout>
                چرخش کلید مقدار تازه می‌سازد و مقدار قبلی را بی‌اعتبار می‌کند. این کار، مثل ساخت و ابطال، فقط برای owner و admin است.
              </Callout>
            </Section>

            <Section id="modules" title="بقیه ماژول‌ها">
              <div className="space-y-4">
                <Module title="صورتحساب">
                  محصول، طرح و entitlement را در تب صورتحساب تعریف کنید. اپ با کلید publishable لیست محصولات را از <Code>GET /api/v1/billing/products</Code> می‌گیرد. تأیید خرید <Code>POST /api/v1/billing/purchases/verify</Code> است و اشتراک‌ها از <Code>GET /api/v1/billing/subscriptions</Code> خوانده می‌شوند. تأیید شبیه‌سازی‌شده فروشگاه فقط در Development و Staging انجام می‌شود.
                </Module>
                <Module title="ذخیره‌سازی">
                  فایل‌های هر محیط از تب ذخیره‌سازی پروژه آپلود و حذف می‌شوند. حجم در سهمیه storage_bytes حساب می‌شود.
                </Module>
                <Module title="اعلان و وب‌هوک">
                  قالب اعلان و ارسال از تب اعلان پروژه است. وب‌هوک به آدرس شما POST می‌زند و امضا را در <Code>x-atrina-signature</Code> با شکل <Code>t=&lt;زمان&gt;,s=&lt;hmac&gt;</Code> می‌فرستد. تحویل ناموفق را می‌توان از همان تب دوباره فرستاد.
                </Module>
                <Module title="سهمیه، ممیزی، استفاده">
                  سهمیه‌ها درخواست API، حجم فایل، کاربر ماهانه و خرید ماهانه را محدود می‌کنند. ممیزی کارهای حساس داشبورد را نگه می‌دارد و تب استفاده روند درخواست‌ها را نشان می‌دهد.
                </Module>
              </div>
            </Section>

            <Section id="reference" title="مرجع داخل محصول و SDK">
              <p>
                تب مرجع API هر پروژه، مسیرهای همان محیط را با جدول‌های واقعی، نمونه بدنه و قطعه کد cURL، JavaScript، Dart، Kotlin، Swift و Python می‌سازد. از همان‌جا می‌توانید درخواست را آزمایش کنید؛ آزمایش با نشست داشبورد شما انجام می‌شود و هدر کلاینت را به‌عنوان مجوز قبول نمی‌کند.
              </p>
              <p>
                مرکز SDK در منوی داشبورد بسته‌های JavaScript، Android، iOS و Flutter را برای وصل شدن به همین API در اختیار می‌گذارد.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild className="gap-1.5">
                  <Link href="/?view=signup">
                    ساخت حساب
                    <ArrowLeft className="size-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/?view=login">ورود به داشبورد</Link>
                </Button>
              </div>
            </Section>
          </article>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-4 text-[15px] leading-7 text-foreground/90">{children}</div>
    </section>
  );
}

function Concept({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-4">
      <div className="flex items-center gap-2 font-medium mb-1.5">
        <Icon className="size-4 text-primary" />
        {title}
      </div>
      <p className="text-sm text-muted-foreground leading-6">{text}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 size-7 shrink-0 rounded-lg bg-primary/15 text-primary text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-sm text-muted-foreground leading-6 mt-0.5">{children}</p>
      </div>
    </li>
  );
}

function Row({ role, text }: { role: string; text: string }) {
  return (
    <tr className="border-t border-border/70">
      <td className="px-3 py-2.5 align-top font-medium whitespace-nowrap">{role}</td>
      <td className="px-3 py-2.5 text-muted-foreground" dir="auto">{text}</td>
    </tr>
  );
}

function Module({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-6">{children}</p>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-6">
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono">
      {children}
    </code>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "کپی شد" : "کپی"}
        </button>
      </div>
      <pre dir="ltr" className="overflow-x-auto p-4 text-left text-xs leading-relaxed font-mono">
        {code}
      </pre>
    </div>
  );
}
