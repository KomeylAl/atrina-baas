# Atrina BaaS

پلتفرم BaaS چند-پروژه‌ای آترینا — بک‌اند به‌عنوان سرویس برای اپ‌های موبایل، وب و SaaS.

## شروع سریع

### ۱. نصب وابستگی‌ها

```bash
# با Bun (پیشنهادی — سریع‌تر)
bun install

# یا با npm
npm install
```

### ۲. راه‌اندازی پایگاه داده

پروژه به‌صورت پیش‌فرض از SQLite (پایگاه داده‌ی محلی) استفاده می‌کنه:

```bash
bun run db:push
```

برای PostgreSQL (پروداکشن)، `prisma/schema.prisma` رو تغییر بده و `DATABASE_URL` رو در `.env` set کن. راهنمای کامل در `docs/postgresql-migration.md`.

### ۳. اجرای سرور توسعه

```bash
bun run dev
```

سرور روی http://localhost:3000 اجرا می‌شه.

### ۴. (اختیاری) داده‌ی دمو

```bash
bun run scripts/seed.ts
```

این دستور:
- یه کاربر دمو می‌سازه: demo@atrina.io / atrina123
- یه سازمان (Atrina) + ۲ پروژه (mobile-app, admin-panel)
- ۵ محیط + ۷ کلید API
- ۴ کاربر پروژه (alice, bob, blocked, tester)
- جدول‌های داده (posts, profiles, comments) با رکوردهای نمونه
- محصولات، طرح‌ها، اشتراک‌ها و خریدها
- فایل‌های ذخیره‌سازی، قالب‌های نوتیفیکیشن، وب‌هوک و سهمیه‌ها
- ۳۰ روز داده‌ی استفاده برای نمودارها

## حساب دمو

بعد از seed، با این حساب‌ها وارد شو:

| سطح | ایمیل | رمز |
|---|---|---|
| داشبورد | demo@atrina.io | atrina123 |
| کاربر پروژه | alice@example.com | alice123 |
| کاربر پروژه | bob@example.com | bob123456 |
| کاربر پروژه | tester@example.com | tester12 |

## ساختار پروژه

```
atrina-baas/
├── src/                          # اپلیکیشن Next.js
│   ├── app/                       # App Router
│   │   ├── api/                   # API Routes
│   │   │   ├── auth/              # احراز هویت داشبورد
│   │   │   ├── organizations/     # سازمان‌ها و پروژه‌ها
│   │   │   ├── projects/          # مدیریت پروژه
│   │   │   ├── v1/                # ★ Data Plane (API عمومی)
│   │   │   │   ├── auth/          # احراز کاربران نهایی
│   │   │   │   ├── data/          # CRUD داده
│   │   │   │   ├── billing/       # صورتحساب و اشتراک
│   │   │   │   └── storage/       # آپلود/دانلود فایل
│   │   │   └── health/           # Health check
│   │   ├── layout.tsx             # RTL + Vazirmatn + Dark theme
│   │   ├── page.tsx              # صفحه‌ی ورودی
│   │   └── globals.css           # تم Atrina (بنفش-ارغوانی)
│   ├── components/
│   │   ├── auth/                 # صفحه‌ی ورود/ثبت‌نام
│   │   ├── common/               # لوگو، badge وضعیت
│   │   ├── dashboard/            # داشبورد
│   │   │   ├── views/            # نمای کلی، سازمان‌ها، پروژه‌ها، ...
│   │   │   └── sections/         # کاربران، داده، صورتحساب، ذخیره‌سازی،
│   │   │                          نوتیفیکیشن، وب‌هوک، سهمیه، مرجع API
│   │   └── layout/               # sidebar + topbar
│   ├── lib/
│   │   ├── auth/                  # احراز هویت
│   │   ├── api/                   # response helpers, code snippets
│   │   ├── audit.ts              # audit logging با redaction
│   │   ├── billing/              # adapters (CafeBazaar, Myket)
│   │   ├── data/                  # schema validator + policy engine
│   │   ├── notifications/        # SMS/Email/Push providers
│   │   ├── observability/        # structured JSON logger
│   │   ├── quotas/               # quota middleware
│   │   ├── security/             # crypto, rate limit
│   │   ├── storage/              # local/S3 adapter
│   │   └── webhooks/             # real HTTP delivery + signature
│   └── stores/                   # Zustand stores
├── prisma/
│   └── schema.prisma             # ۲۲ مدل (فاز ۰ تا ۶)
├── packages/                     # ★ SDKهای رسمی
│   ├── sdk-js/                   # JavaScript/TypeScript SDK
│   ├── sdk-android/              # Kotlin SDK
│   ├── sdk-ios/                  # Swift SDK
│   └── sdk-flutter/             # Dart SDK
├── download/                    # SDKهای قابل دانلود
├── docs/                         # مستندات
│   ├── postgresql-migration.md  # راهنمای مهاجرت به PostgreSQL
│   ├── architecture/
│   │   └── billing-provider-matrix.md
│   └── operations/
│       └── deployment.md         # راهنمای deployment
├── scripts/
│   ├── seed.ts                   # داده‌ی دمو
│   └── deploy.sh                 # اسکریپت deployment
├── mini-services/                # سرویس‌های کمکی
│   └── webhook-receiver/         # برای تست وب‌هوک
└── .env.example                  # نمونه‌ی تنظیمات محیطی
```

## ماژول‌های پلتفرم

### Control Plane (داشبورد)
- سازمان‌ها، پروژه‌ها، محیط‌ها، کلیدهای API
- مدیریت کاربران پروژه (block/unblock، revoke sessions)
- Schema Builder بصری با ۱۴ نوع داده
- صورتحساب (محصولات، طرح‌ها، اشتراک‌ها، فروشگاه‌ها)
- ذخیره‌سازی، نوتیفیکیشن، وب‌هوک، سهمیه‌ها
- ممیزی، استفاده، تنظیمات
- مرجع API با نمونه‌ی کد در ۶ زبان + Try-it-out
- مرکز SDK با ۴ SDK قابل دانلود

### Data Plane (API عمومی)
- /api/v1/auth/* — احراز هویت کاربران نهایی
- /api/v1/data/{table} — CRUD با schema validation و row-level policies
- /api/v1/billing/* — محصولات، طرح‌ها، احراز خرید، اشتراک‌ها
- /api/v1/storage/* — آپلود/دانلود فایل

## SDKها

| پلتفرم | فایل | نصب |
|---|---|---|
| JavaScript/TS | packages/sdk-js/ | npm install @atrina/baas-sdk |
| Android (Kotlin) | packages/sdk-android/atrina-sdk.kt | OkHttp 4.x |
| iOS (Swift) | packages/sdk-ios/AtrinaSDK.swift | iOS 15+، zero deps |
| Flutter (Dart) | packages/sdk-flutter/atrina_sdk.dart | flutter pub add http |

## دستورات

| Command | توضیح |
|---|---|
| bun run dev | اجرای سرور توسعه روی پورت 3000 |
| bun run build | build پروداکشن |
| bun run start | اجرای build پروداکشن |
| bun run lint | اجرای ESLint |
| bun run db:push | push schema به دیتابیس |
| bun run db:generate | generate Prisma Client |
| bun run scripts/seed.ts | پر کردن دیتابیس با داده‌ی دمو |
| bash scripts/deploy.sh | deployment پروداکشن |

## تکنولوژی‌ها

- Framework: Next.js 16 (App Router) + React 19
- Language: TypeScript 5
- Styling: Tailwind CSS 4 + shadcn/ui
- Database: Prisma ORM (SQLite local / PostgreSQL production)
- Auth: Cookie-based sessions (scrypt, SHA-256)
- Fonts: Vazirmatn (Persian RTL)
- Icons: Lucide React
- State: Zustand + TanStack Query
- Theme: Modern Dark با برند رنگ بنفش-ارغوانی Atrina

## لایسنس

MIT — استفاده‌ی آزاد برای پروژه‌های داخلی و تجاری.
