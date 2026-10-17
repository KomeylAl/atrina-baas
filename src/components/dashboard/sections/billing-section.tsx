"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CreditCard, Trash2, Loader2, Boxes, Gift, X } from "lucide-react";
import { toast } from "sonner";
import { SectionLoading, EmptyState, SectionHeader } from "@/components/dashboard/widgets/common";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber, formatDateShort, toPersianDigits } from "@/lib/utils/format";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CAPABILITY_MATRIX } from "@/lib/billing/providers";

type ProductRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  plans: Array<{
    id: string;
    code: string;
    name: string;
    billingPeriodUnit: string;
    billingPeriodCount: number;
    price: number;
    currency: string;
    status: string;
    subscriptionsCount: number;
    purchasesCount: number;
    entitlements: Array<{ code: string; name: string; value: unknown }>;
  }>;
};

type SubscriptionRow = {
  id: string;
  status: string;
  provider: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  user: { id: string; email: string | null; displayName: string | null };
  plan: { code: string; name: string; product: string } | null;
  environment: { id: string; name: string };
  createdAt: string;
};

type ProviderRow = {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  environment: { id: string; name: string };
  createdAt: string;
};

export function BillingSection({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const [activeTab, setActiveTab] = useState<"products" | "subscriptions" | "providers">("products");

  return (
    <div className="space-y-4">
      <SectionHeader title="صورتحساب و اشتراک" description="محصولات، طرح‌ها، اشتراک‌ها و پشتیبان‌های فروشگاه" />

      <div className="flex items-center gap-2 border-b border-border/60">
        {[
          { id: "products", label: "محصولات و طرح‌ها", icon: Boxes },
          { id: "subscriptions", label: "اشتراک‌ها", icon: CreditCard },
          { id: "providers", label: "فروشگاه‌ها", icon: Plus },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "products" && <ProductsTab projectId={projectId} />}
      {activeTab === "subscriptions" && <SubscriptionsTab projectId={projectId} environments={environments} />}
      {activeTab === "providers" && <ProvidersTab projectId={projectId} environments={environments} />}
    </div>
  );
}

function ProductsTab({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pCode, setPCode] = useState("");
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [plCode, setPlCode] = useState("");
  const [plName, setPlName] = useState("");
  const [plPrice, setPlPrice] = useState("");
  const [plUnit, setPlUnit] = useState<"day" | "week" | "month" | "year">("month");
  const [plCount, setPlCount] = useState("1");

  const { data, isLoading } = useQuery<{ products: ProductRow[] }>({
    queryKey: ["project-products", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/products`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { products: json.data.products };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleCreate() {
    if (creating) return;
    if (pCode.length < 2 || pName.length < 2) return toast.error("کد و نام محصول الزامی است");
    if (plCode.length < 2 || plName.length < 2) return toast.error("کد و نام طرح الزامی است");
    setCreating(true);
    try {
      // Create product
      const r1 = await fetch(`/api/projects/${projectId}/products`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: pCode, name: pName, description: pDesc || null }),
      });
      const j1 = await r1.json();
      if (!r1.ok) return toast.error(j1.error?.message ?? "خطا در ساخت محصول");
      const productId = j1.data.product.id;

      // Create plan
      const r2 = await fetch(`/api/projects/${projectId}/plans`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          code: plCode,
          name: plName,
          billingPeriodUnit: plUnit,
          billingPeriodCount: Number(plCount),
          price: Number(plPrice),
          currency: "IRR",
          entitlements: [{ code: "pro", value: true }],
        }),
      });
      const j2 = await r2.json();
      if (!r2.ok) return toast.error(j2.error?.message ?? "خطا در ساخت طرح");

      toast.success("محصول و طرح ساخته شد");
      setCreateOpen(false);
      setPCode(""); setPName(""); setPDesc(""); setPlCode(""); setPlName(""); setPlPrice("");
      qc.invalidateQueries({ queryKey: ["project-products", projectId] });
    } finally {
      setCreating(false);
    }
  }

  const products = data?.products ?? [];

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> محصول + طرح جدید
        </Button>
      </div>

      {isLoading ? <SectionLoading /> : products.length === 0 ? (
        <EmptyState icon={Boxes} title="هیچ محصولی وجود ندارد" description="محصولات و طرح‌ها را بسازید تا کاربران بتوانند اشتراک بخرند." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {products.map((p) => (
            <Card key={p.id} className="bg-card/40 border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
                  </div>
                  <StatusBadge value={p.status} />
                </div>
                {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}
                <div className="space-y-2 mt-3 border-t border-border/60 pt-3">
                  {p.plans.map((pl) => (
                    <div key={pl.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{pl.name}</span>
                        <span className="font-mono">{formatNumber(pl.price)} {pl.currency}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{toPersianDigits(pl.billingPeriodCount)} {periodLabel(pl.billingPeriodUnit)}</span>
                        <StatusBadge value={pl.status} />
                      </div>
                      <div className="text-muted-foreground">
                        {formatNumber(pl.subscriptionsCount)} اشتراک · {formatNumber(pl.purchasesCount)} خرید
                      </div>
                      {pl.entitlements.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {pl.entitlements.map((e) => (
                            <span key={e.code} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{e.code}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ساخت محصول و طرح اولیه</DialogTitle>
            <DialogDescription>
              یک محصول (مثلاً "اشتراک پرو") + یک طرح (مثلاً "ماهانه") در یک عملیات ساخته می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2 border-b border-border/60 pb-3">
              <div className="text-sm font-medium">محصول</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">کد</Label>
                  <Input value={pCode} onChange={(e) => setPCode(e.target.value)} placeholder="pro_plan" className="bg-card/40 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">نام</Label>
                  <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="اشتراک پرو" className="bg-card/40" />
                </div>
              </div>
              <div>
                <Label className="text-xs">توضیحات</Label>
                <Input value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="اختیاری" className="bg-card/40" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">طرح اولیه</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">کد طرح</Label>
                  <Input value={plCode} onChange={(e) => setPlCode(e.target.value)} placeholder="monthly" className="bg-card/40 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">نام طرح</Label>
                  <Input value={plName} onChange={(e) => setPlName(e.target.value)} placeholder="ماهانه" className="bg-card/40" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">قیمت (ریال)</Label>
                  <Input value={plPrice} onChange={(e) => setPlPrice(e.target.value)} type="number" placeholder="50000" className="bg-card/40" />
                </div>
                <div>
                  <Label className="text-xs">واحد دوره</Label>
                  <Select value={plUnit} onValueChange={(v: typeof plUnit) => setPlUnit(v)}>
                    <SelectTrigger className="bg-card/40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">روز</SelectItem>
                      <SelectItem value="week">هفته</SelectItem>
                      <SelectItem value="month">ماه</SelectItem>
                      <SelectItem value="year">سال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">تعداد دوره</Label>
                  <Input value={plCount} onChange={(e) => setPlCount(e.target.value)} type="number" className="bg-card/40" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="size-4 animate-spin" />} ساخت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubscriptionsTab({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const [envId, setEnvId] = useState<string | null>(environments[0]?.id ?? null);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ subscriptions: SubscriptionRow[] }>({
    queryKey: ["project-subscriptions", projectId, envId],
    queryFn: async () => {
      const params = new URLSearchParams();
      const r = await fetch(`/api/projects/${projectId}/subscriptions?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { subscriptions: json.data.subscriptions };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const subs = (data?.subscriptions ?? []).filter((s) => !envId || s.environment.id === envId);

  async function cancel(subId: string) {
    const r = await fetch(`/api/projects/${projectId}/subscriptions/${subId}/cancel`, { method: "POST" });
    if (!r.ok) {
      const j = await r.json();
      return toast.error(j.error?.message ?? "خطا");
    }
    toast.success("لغو در پایان دوره ثبت شد");
    qc.invalidateQueries({ queryKey: ["project-subscriptions", projectId, envId] });
  }

  return (
    <div>
      <div className="mb-3">
        <SectionLoading />
      </div>
      <div className="mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {environments.map((e) => (
            <button
              key={e.id}
              onClick={() => setEnvId(e.id)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border ${
                envId === e.id ? "bg-primary text-primary-foreground border-primary" : "bg-card/40 text-muted-foreground border-border"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? <SectionLoading /> : subs.length === 0 ? (
        <EmptyState icon={CreditCard} title="اشتراکی وجود ندارد" description="وقتی کاربران خرید انجام دهند، اشتراک اینجا نمایش داده می‌شود." />
      ) : (
        <Card className="bg-card/40 border-border/60">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="text-right px-4 py-3 font-medium">کاربر</th>
                  <th className="text-right px-4 py-3 font-medium">طرح</th>
                  <th className="text-right px-4 py-3 font-medium">فروشگاه</th>
                  <th className="text-right px-4 py-3 font-medium">پایان دوره</th>
                  <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                  <th className="text-right px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.user.displayName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{s.user.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{s.plan ? `${s.plan.name} (${s.plan.product})` : "—"}</td>
                    <td className="px-4 py-3 text-xs">{s.provider}</td>
                    <td className="px-4 py-3 text-xs">{s.currentPeriodEnd ? formatDateShort(s.currentPeriodEnd) : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                    <td className="px-4 py-3">
                      {s.status === "active" && !s.cancelAtPeriodEnd && (
                        <Button size="sm" variant="ghost" className="text-destructive h-7 text-xs" onClick={() => cancel(s.id)}>
                          لغو
                        </Button>
                      )}
                      {s.cancelAtPeriodEnd && <span className="text-xs text-muted-foreground">لغو‌شده</span>}
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

function ProvidersTab({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const [envId, setEnvId] = useState<string | null>(environments[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [provName, setProvName] = useState<"cafebazaar" | "myket">("cafebazaar");
  const [displayName, setDisplayName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["project-billing-providers", projectId, envId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (envId) params.set("envId", envId);
      const r = await fetch(`/api/projects/${projectId}/billing-providers?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return json.data;
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleCreate() {
    if (!envId) return toast.error("یک محیط انتخاب کنید");
    if (displayName.length < 2) return toast.error("نام نمایشی لازم است");
    const r = await fetch(`/api/projects/${projectId}/billing-providers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ environmentId: envId, provider: provName, displayName, configuration: { mock: true } }),
    });
    const j = await r.json();
    if (!r.ok) return toast.error(j.error?.message ?? "خطا");
    toast.success("فروشگاه اضافه شد");
    setCreateOpen(false);
    setDisplayName("");
    qc.invalidateQueries({ queryKey: ["project-billing-providers", projectId, envId] });
  }

  const providers = data?.providers ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {environments.map((e) => (
            <button
              key={e.id}
              onClick={() => setEnvId(e.id)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap border ${
                envId === e.id ? "bg-primary text-primary-foreground border-primary" : "bg-card/40 text-muted-foreground border-border"
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)} disabled={!envId}>
          <Plus className="size-4" /> فروشگاه جدید
        </Button>
      </div>

      {isLoading ? <SectionLoading /> : providers.length === 0 ? (
        <EmptyState icon={Plus} title="فروشگاهی پیکربندی نشده" description="برای فعال‌سازی احراز خرید، یک فروشگاه (CafeBazaar یا Myket) اضافه کنید." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {providers.map((p: ProviderRow) => (
            <Card key={p.id} className="bg-card/40 border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{p.displayName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.provider}</div>
                  </div>
                  <StatusBadge value={p.status} />
                </div>
                <div className="text-xs text-muted-foreground mt-2">محیط: {p.environment.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ساخته شد: {formatDateShort(p.createdAt)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-card/40 border-border/60 mt-4">
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-3">ماتریس قابلیت‌ها (Capability Matrix)</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="text-right py-2 font-medium">فروشگاه</th>
                <th className="text-right py-2 font-medium">اشتراک تکرارشونده</th>
                <th className="text-right py-2 font-medium">وب‌هوک</th>
                <th className="text-right py-2 font-medium">احراز سمت-سرور</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CAPABILITY_MATRIX).map(([k, v]) => (
                <tr key={k} className="border-b border-border/30">
                  <td className="py-2 font-mono">{k}</td>
                  <td className="py-2">{v.recurring ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}</td>
                  <td className="py-2">{v.webhooks ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}</td>
                  <td className="py-2">{v.serverVerification ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-muted-foreground mt-2">
            Mock adapterها فعال هستند. در نسخه نهایی، جایگزین API واقعی فروشگاه‌ها خواهند شد.
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن فروشگاه</DialogTitle>
            <DialogDescription>یک پشتیبان فروشگاه را به محیط انتخاب‌شده اضافه کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>فروشگاه</Label>
              <Select value={provName} onValueChange={(v: typeof provName) => setProvName(v)}>
                <SelectTrigger className="mt-1.5 bg-card/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cafebazaar">CafeBazaar</SelectItem>
                  <SelectItem value="myket">Myket</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>نام نمایشی</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="مثلاً: فروشگاه اصلی" className="mt-1.5 bg-card/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreate}>افزودن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function periodLabel(unit: string): string {
  const map: Record<string, string> = { day: "روز", week: "هفته", month: "ماه", year: "سال" };
  return map[unit] ?? unit;
}
