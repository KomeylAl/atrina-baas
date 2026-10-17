"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Code2,
  Download,
  Smartphone,
  Apple,
  Copy,
  Check,
  Terminal,
  Package,
} from "lucide-react";
import { useState, useMemo } from "react";
import { SectionHeader } from "@/components/dashboard/widgets/common";
import { toast } from "sonner";

type SDKInfo = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  install: string;
  installLabel: string;
  quickStart: string;
  fileName: string;
  filePath: string;
  fileSize: string;
};

const SDKS: SDKInfo[] = [
  {
    id: "js",
    name: "JavaScript / TypeScript",
    icon: Code2,
    color: "text-warning",
    description: "SDK کامل برای وب و Node.js با TypeScript types، retry logic و error handling.",
    install: "npm install @atrina/baas-sdk",
    installLabel: "نصب با npm",
    quickStart: `import { Atrina } from "@atrina/baas-sdk";

const atrina = new Atrina({
  baseUrl: "https://api.atrina.io/api/v1",
  apiKey: "atr_pk_production_...",
});

// Signup
const { user, token } = await atrina.auth.signup({
  email: "alice@example.com",
  password: "secret123",
  displayName: "Alice",
});

// Data
const posts = atrina.data.table<{ title: string; body: string }>("posts");
const list = await posts.list({ page: 1, pageSize: 10 });
const post = await posts.create({ title: "Hello", body: "World" });

// Billing
const result = await atrina.billing.verifyPurchase({
  planId: "...",
  purchaseToken: "...",
  storeProductId: "...",
  provider: "cafebazaar",
});`,
    fileName: "sdk-js/",
    filePath: "/download/sdk-js/src/index.ts",
    fileSize: "~8 KB (6 فایل)",
  },
  {
    id: "android",
    name: "Android (Kotlin)",
    icon: Smartphone,
    color: "text-success",
    description: "SDK کامل برای Android با OkHttp، coroutine-ready و full type safety.",
    install: 'implementation("com.squareup.okhttp3:okhttp:4.12.0")',
    installLabel: "build.gradle — dependencies",
    quickStart: `val atrina = AtrinaClient(
    AtrinaConfig(
        baseUrl = "https://api.atrina.io/api/v1",
        apiKey = "atr_pk_production_..."
    )
)

// Signup
val session = atrina.auth.signup(
    email = "alice@example.com",
    password = "secret123",
    displayName = "Alice"
)

// Data
val posts = atrina.data.table("posts")
val list = posts.list()
val post = posts.create(mapOf("title" to "Hello", "body" to "World"))

// Billing
val result = atrina.billing.verifyPurchase(
    planId = "...",
    purchaseToken = "...",
    storeProductId = "...",
    provider = "cafebazaar"
)`,
    fileName: "atrina-sdk.kt",
    filePath: "/download/atrina-sdk.kt",
    fileSize: "~9 KB (1 فایل)",
  },
  {
    id: "ios",
    name: "iOS (Swift)",
    icon: Apple,
    color: "text-info",
    description: "SDK کامل برای iOS 15+ با async/await، URLSession و zero dependencies.",
    install: "// به Package.swift اضافه کنید یا مستقیم کپی کنید",
    installLabel: "نصب",
    quickStart: `let atrina = AtrinaClient(
    config: AtrinaConfig(
        baseUrl: "https://api.atrina.io/api/v1",
        apiKey: "atr_pk_production_..."
    )
)

// Signup
let session = try await atrina.auth.signup(
    email: "alice@example.com",
    password: "secret123",
    displayName: "Alice"
)

// Data
let posts = atrina.data.table("posts")
let list = try await posts.list()
let post = try await posts.create(["title": "Hello", "body": "World"])`,
    fileName: "AtrinaSDK.swift",
    filePath: "/download/AtrinaSDK.swift",
    fileSize: "~11 KB (1 فایل)",
  },
  {
    id: "flutter",
    name: "Flutter (Dart)",
    icon: Package,
    color: "text-primary",
    description: "SDK کامل برای Flutter با http package، Future-based و cross-platform.",
    install: "flutter pub add http",
    installLabel: "نصب با pub",
    quickStart: `final atrina = AtrinaClient(
  AtrinaConfig(
    baseUrl: 'https://api.atrina.io/api/v1',
    apiKey: 'atr_pk_production_...',
  ),
);

// Signup
final session = await atrina.auth.signup(
  email: 'alice@example.com',
  password: 'secret123',
  displayName: 'Alice',
);

// Data
final posts = atrina.data.table('posts');
final list = await posts.list();
final post = await posts.create({'title': 'Hello', 'body': 'World'});`,
    fileName: "atrina_sdk.dart",
    filePath: "/download/atrina_sdk.dart",
    fileSize: "~9 KB (1 فایل)",
  },
];

export function SdkCenterView() {
  const [activeSdk, setActiveSdk] = useState("js");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const sdk = SDKS.find((s) => s.id === activeSdk)!;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <SectionHeader
        title="مرکز SDK"
        description="SDK رسمی برای هر پلتفرم — نصب، استفاده و دانلود"
      />

      {/* SDK cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SDKS.map((s) => (
          <Card
            key={s.id}
            className={`bg-card/40 border-border/60 cursor-pointer transition-all hover:border-primary/40 ${
              activeSdk === s.id ? "border-primary ring-1 ring-primary/30" : ""
            }`}
            onClick={() => setActiveSdk(s.id)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`size-10 rounded-lg bg-muted/30 flex items-center justify-center ${s.color}`}>
                    <s.icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.fileName}</div>
                  </div>
                </div>
                <a href={s.filePath} download>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <Download className="size-3.5" /> دانلود
                  </Button>
                </a>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              <div className="text-xs text-muted-foreground mt-3">{s.fileSize}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected SDK details */}
      <Card className="bg-card/40 border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <sdk.icon className={`size-4 ${sdk.color}`} />
            {sdk.name}
          </CardTitle>
          <CardDescription>{sdk.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Terminal className="size-3" />
                {sdk.installLabel}
              </Label>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6 gap-1"
                onClick={() => copy(sdk.install, `install-${sdk.id}`)}
              >
                {copied === `install-${sdk.id}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                {copied === `install-${sdk.id}` ? "کپی شد" : "کپی"}
              </Button>
            </div>
            <pre className="text-xs bg-card/60 border border-border/40 rounded-lg p-3 overflow-x-auto font-mono" dir="ltr">
              {sdk.install}
            </pre>
          </div>

          {/* Quick start */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Code2 className="size-3" />
                Quick Start
              </Label>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6 gap-1"
                onClick={() => copy(sdk.quickStart, `qs-${sdk.id}`)}
              >
                {copied === `qs-${sdk.id}` ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
                {copied === `qs-${sdk.id}` ? "کپی شد" : "کپی"}
              </Button>
            </div>
            <pre className="text-xs bg-card/60 border border-border/40 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed" dir="ltr">
              {sdk.quickStart}
            </pre>
          </div>

          {/* Download button */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <a href={sdk.filePath} download>
              <Button className="gap-2">
                <Download className="size-4" />
                دانلود {sdk.fileName}
              </Button>
            </a>
            <span className="text-xs text-muted-foreground">{sdk.fileSize}</span>
          </div>
        </CardContent>
      </Card>

      {/* Feature matrix */}
      <Card className="bg-card/40 border-border/60">
        <CardHeader>
          <CardTitle className="text-base">پشتیبانی ماژول‌ها</CardTitle>
          <CardDescription>تمام SDKها از همه‌ی ماژول‌های پلتفرم پشتیبانی می‌کنند</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs text-muted-foreground">
                <th className="text-right py-2 font-medium">ماژول</th>
                {SDKS.map((s) => (
                  <th key={s.id} className="text-center py-2 font-medium">{s.name.split(" ")[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { module: "Auth (signup/login/logout/me)", supported: true },
                { module: "Data (CRUD + pagination)", supported: true },
                { module: "Billing (products/verify/subscriptions)", supported: true },
                { module: "Storage (upload/download)", supported: true },
                { module: "Type-safe generics (JS/TS only)", supported: "partial" },
                { module: "Auto-retry on 5xx", supported: true },
                { module: "Timeout configuration", supported: true },
              ].map((row) => (
                <tr key={row.module} className="border-b border-border/30">
                  <td className="py-2 text-xs">{row.module}</td>
                  {SDKS.map((s) => (
                    <td key={s.id} className="text-center py-2">
                      {row.supported === true ? (
                        <Check className="size-4 text-success mx-auto" />
                      ) : row.supported === "partial" && s.id === "js" ? (
                        <Check className="size-4 text-success mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>;
}
