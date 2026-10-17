"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Webhook, Plus, Trash2, Loader2, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SectionLoading, EmptyState, EnvPicker, SectionHeader } from "@/components/dashboard/widgets/common";
import { StatusBadge } from "@/components/common/status-badge";
import { timeAgo } from "@/lib/utils/format";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type EndpointRow = {
  id: string;
  url: string;
  events: string[];
  status: string;
  environment: { id: string; name: string };
  deliveriesCount: number;
  signingSecretPrefix: string;
  createdAt: string;
};

type DeliveryRow = {
  id: string;
  endpoint: { id: string; url: string };
  eventType: string;
  status: string;
  attempts: number;
  responseCode: number | null;
  errorMessage: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  deliveredAt: string | null;
};

export function WebhooksSection({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const [envId, setEnvId] = useState<string | null>(environments[0]?.id ?? null);
  const [tab, setTab] = useState("endpoints");
  const [createOpen, setCreateOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("");
  const [testEndpointId, setTestEndpointId] = useState("");
  const [testEventType, setTestEventType] = useState("test.event");
  const [testPayload, setTestPayload] = useState("{}");
  const [secretResult, setSecretResult] = useState<string | null>(null);

  const { data: endpointsData, isLoading } = useQuery<{ endpoints: EndpointRow[] }>({
    queryKey: ["project-webhooks", projectId, envId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (envId) params.set("envId", envId);
      const r = await fetch(`/api/projects/${projectId}/webhooks/endpoints?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { endpoints: json.data.endpoints };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const { data: deliveriesData } = useQuery<{ deliveries: DeliveryRow[] }>({
    queryKey: ["project-webhook-deliveries", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/webhooks/deliveries`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { deliveries: json.data.deliveries };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleCreate() {
    if (creating) return;
    if (!envId) return toast.error("محیط انتخاب کنید");
    if (!url.startsWith("http")) return toast.error("URL نامعتبر");
    let evts: string[];
    try {
      evts = JSON.parse(events);
      if (!Array.isArray(evts) || evts.length === 0) throw new Error("empty");
    } catch {
      return toast.error("events باید آرایه JSON باشد. مثال: [\"user.created\",\"user.updated\"]");
    }
    setCreating(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/webhooks/endpoints`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ environmentId: envId, url, events: evts }),
      });
      const j = await r.json();
      if (!r.ok) return toast.error(j.error?.message ?? "خطا");
      toast.success("endopoint ساخته شد");
      setSecretResult(j.data.signingSecret);
      setCreateOpen(false);
      setUrl(""); setEvents("");
      qc.invalidateQueries({ queryKey: ["project-webhooks", projectId, envId] });
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const r = await fetch(`/api/projects/${projectId}/webhooks/endpoints/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json();
      return toast.error(j.error?.message ?? "خطا");
    }
    toast.success("endopoint حذف شد");
    qc.invalidateQueries({ queryKey: ["project-webhooks", projectId, envId] });
  }

  async function handleTest() {
    if (testing) return;
    if (!testEndpointId) return toast.error("یک endpoint انتخاب کنید");
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(testPayload);
    } catch {
      return toast.error("payload باید JSON معتبر باشد");
    }
    setTesting(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/webhooks/test`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpointId: testEndpointId, eventType: testEventType, payload }),
      });
      const j = await r.json();
      if (!r.ok) return toast.error(j.error?.message ?? "خطا");
      toast.success("تحویل ثبت شد");
      setTestOpen(false);
      qc.invalidateQueries({ queryKey: ["project-webhook-deliveries", projectId] });
    } finally {
      setTesting(false);
    }
  }

  const endpoints = (endpointsData?.endpoints ?? []).filter((e) => !envId || e.environment.id === envId);
  const deliveries = deliveriesData?.deliveries ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="وب‌هوک‌ها"
        description="endopointهای خروجی برای دریافت رویدادها — با امضا و کنترل تلاش مجدد"
        action={
          <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)} disabled={!envId}>
            <Plus className="size-4" /> endpoint جدید
          </Button>
        }
      />

      <EnvPicker environments={environments} value={envId} onChange={setEnvId} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card/40 border border-border/60">
          <TabsTrigger value="endpoints">endpointها</TabsTrigger>
          <TabsTrigger value="deliveries">تحویل‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints">
          {isLoading ? <SectionLoading /> : endpoints.length === 0 ? (
            <EmptyState icon={Webhook} title="endpointی وجود ندارد" description="برای دریافت رویدادهای خروجی، یک endpoint اضافه کنید." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {endpoints.map((e) => (
                <Card key={e.id} className="bg-card/40 border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <div className="text-xs font-mono truncate" title={e.url}>{e.url}</div>
                        <div className="text-xs text-muted-foreground mt-1">{e.environment.name}</div>
                      </div>
                      <StatusBadge value={e.status} />
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {e.events.map((ev) => (
                        <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono">{ev}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">secret: <span className="font-mono">{e.signingSecretPrefix}</span></span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                          setTestEndpointId(e.id);
                          setTestOpen(true);
                        }}>
                          <Send className="size-3" /> تست
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="deliveries">
          {deliveries.length === 0 ? (
            <EmptyState icon={Send} title="تحویلی ثبت نشده" description="با ارسال تست، تحویل‌ها اینجا نمایش داده می‌شوند." />
          ) : (
            <Card className="bg-card/40 border-border/60">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs text-muted-foreground">
                      <th className="text-right px-4 py-3 font-medium">endpoint</th>
                      <th className="text-right px-4 py-3 font-medium">رویداد</th>
                      <th className="text-right px-4 py-3 font-medium">کد پاسخ</th>
                      <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                      <th className="text-right px-4 py-3 font-medium">زمان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-mono truncate max-w-xs" title={d.endpoint.url}>{d.endpoint.url}</td>
                        <td className="px-4 py-3 text-xs font-mono">{d.eventType}</td>
                        <td className="px-4 py-3 text-xs">{d.responseCode ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge value={d.status} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(d.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setSecretResult(null); }}>
        <DialogContent>
          {!secretResult ? (
            <>
              <DialogHeader>
                <DialogTitle>ساخت endpoint</DialogTitle>
                <DialogDescription>در هر بار که رویداد تطبیق‌پذیر رخ دهد، webhook به این URL ارسال می‌شود.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label>URL</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" className="mt-1.5 bg-card/40 font-mono" />
                </div>
                <div>
                  <Label>رویدادها (JSON)</Label>
                  <Input value={events} onChange={(e) => setEvents(e.target.value)} placeholder={`["user.created","subscription.expired"]`} className="mt-1.5 bg-card/40 font-mono" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
                <Button onClick={handleCreate} disabled={creating} className="gap-2">
                  {creating && <Loader2 className="size-4 animate-spin" />} ساخت
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>endpoint ساخته شد</DialogTitle>
                <DialogDescription>این signing secret فقط یک بار نمایش داده می‌شود.</DialogDescription>
              </DialogHeader>
              <div className="font-mono text-xs bg-card border border-border/60 rounded-lg p-3 break-all">
                {secretResult}
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  navigator.clipboard.writeText(secretResult);
                  toast.success("در کلیپ‌بورد کپی شد");
                }} className="gap-2">کپی</Button>
                <Button variant="outline" onClick={() => setSecretResult(null)}>بستن</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ارسال تست وب‌هوک</DialogTitle>
            <DialogDescription>یک رویداد تست به endpoint انتخاب‌شده ارسال می‌شود.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>نوع رویداد</Label>
              <Input value={testEventType} onChange={(e) => setTestEventType(e.target.value)} className="mt-1.5 bg-card/40 font-mono" />
            </div>
            <div>
              <Label>payload (JSON)</Label>
              <textarea value={testPayload} onChange={(e) => setTestPayload(e.target.value)} rows={4} className="mt-1.5 w-full rounded-md border border-border bg-card/40 px-3 py-2 text-sm font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestOpen(false)}>انصراف</Button>
            <Button onClick={handleTest} disabled={testing} className="gap-2">
              {testing && <Loader2 className="size-4 animate-spin" />} ارسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
