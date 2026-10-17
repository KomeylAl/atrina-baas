"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send, Trash2, Plus, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import { SectionLoading, EmptyState, EnvPicker, SectionHeader } from "@/components/dashboard/widgets/common";
import { StatusBadge } from "@/components/common/status-badge";
import { timeAgo } from "@/lib/utils/format";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type TemplateRow = {
  id: string;
  channel: string;
  code: string;
  name: string;
  subject: string | null;
  body: string;
  status: string;
  environment: { id: string; name: string };
  createdAt: string;
};

type LogRow = {
  id: string;
  channel: string;
  provider: string;
  templateCode: string | null;
  recipient: string;
  status: string;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
};

export function NotificationsSection({ projectId, environments }: { projectId: string; environments: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("templates");
  const [envId, setEnvId] = useState<string | null>(environments[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [tplChannel, setTplChannel] = useState<"sms" | "email" | "push">("sms");
  const [tplCode, setTplCode] = useState("");
  const [tplName, setTplName] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [sendChannel, setSendChannel] = useState<"sms" | "email" | "push">("sms");
  const [sendTemplateCode, setSendTemplateCode] = useState("");
  const [sendRecipient, setSendRecipient] = useState("");

  const { data: templatesData, isLoading: templatesLoading } = useQuery<{ templates: TemplateRow[] }>({
    queryKey: ["project-templates", projectId, envId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (envId) params.set("envId", envId);
      const r = await fetch(`/api/projects/${projectId}/notifications/templates?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { templates: json.data.templates };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const { data: logsData } = useQuery<{ logs: LogRow[] }>({
    queryKey: ["project-logs", projectId, envId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (envId) params.set("envId", envId);
      const r = await fetch(`/api/projects/${projectId}/notifications/logs?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return { logs: json.data.logs };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleCreateTemplate() {
    if (creating) return;
    if (!envId) return toast.error("محیط انتخاب کنید");
    if (!tplCode.match(/^[a-zA-Z_][a-zA-Z0-9_-]*$/)) return toast.error("کد قالب نامعتبر");
    if (tplBody.length < 5) return toast.error("متن پیام کوتاه است");
    setCreating(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/notifications/templates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environmentId: envId,
          channel: tplChannel,
          code: tplCode,
          name: tplName,
          subject: tplSubject || null,
          body: tplBody,
        }),
      });
      const j = await r.json();
      if (!r.ok) return toast.error(j.error?.message ?? "خطا");
      toast.success("قالب ساخته شد");
      setCreateOpen(false);
      setTplCode(""); setTplName(""); setTplSubject(""); setTplBody("");
      qc.invalidateQueries({ queryKey: ["project-templates", projectId, envId] });
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    const r = await fetch(`/api/projects/${projectId}/notifications/templates/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json();
      return toast.error(j.error?.message ?? "خطا");
    }
    toast.success("قالب حذف شد");
    qc.invalidateQueries({ queryKey: ["project-templates", projectId, envId] });
  }

  async function handleSend() {
    if (sending) return;
    if (!envId) return toast.error("محیط انتخاب کنید");
    if (!sendRecipient) return toast.error("گیرنده لازم است");
    setSending(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/notifications/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environmentId: envId,
          channel: sendChannel,
          templateCode: sendTemplateCode || undefined,
          recipient: sendRecipient,
          variables: {},
        }),
      });
      const j = await r.json();
      if (!r.ok) return toast.error(j.error?.message ?? "خطا");
      toast.success("پیام ارسال شد");
      setSendOpen(false);
      setSendRecipient(""); setSendTemplateCode("");
      qc.invalidateQueries({ queryKey: ["project-logs", projectId, envId] });
    } finally {
      setSending(false);
    }
  }

  const templates = (templatesData?.templates ?? []).filter((t) => !envId || t.environment.id === envId);
  const logs = (logsData?.logs ?? []).filter((l) => true);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="نوتیفیکیشن‌ها"
        description="قالب‌های پیام و تاریخچه ارسال — پشتیبان‌های SMS/Email/Push به‌صورت Mock فعال هستند"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setSendOpen(true)} disabled={!envId}>
              <Send className="size-4" /> ارسال دستی
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)} disabled={!envId}>
              <Plus className="size-4" /> قالب جدید
            </Button>
          </div>
        }
      />

      <EnvPicker environments={environments} value={envId} onChange={setEnvId} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card/40 border border-border/60">
          <TabsTrigger value="templates">قالب‌ها</TabsTrigger>
          <TabsTrigger value="logs">تاریخچه ارسال</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          {templatesLoading ? <SectionLoading /> : templates.length === 0 ? (
            <EmptyState icon={Mail} title="قالبی وجود ندارد" description="قالب‌های SMS/Email/Push را بسازید تا با متغیرها پر شوند." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((t) => (
                <Card key={t.id} className="bg-card/40 border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{t.code}</div>
                      </div>
                      <div className="flex gap-1">
                        <StatusBadge value={t.channel} />
                        <StatusBadge value={t.status} />
                      </div>
                    </div>
                    {t.subject && <div className="text-xs text-muted-foreground mb-2">عنوان: {t.subject}</div>}
                    <div className="text-xs bg-card/60 border border-border/40 rounded p-2 mt-2 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {t.body}
                    </div>
                    <Button size="sm" variant="ghost" className="text-destructive mt-2 text-xs gap-1" onClick={() => handleDeleteTemplate(t.id)}>
                      <Trash2 className="size-3" /> حذف
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          {logs.length === 0 ? (
            <EmptyState icon={Bell} title="پیامی ارسال نشده" description="تاریخچه ارسال پیام‌ها اینجا نمایش داده می‌شود." />
          ) : (
            <Card className="bg-card/40 border-border/60">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs text-muted-foreground">
                      <th className="text-right px-4 py-3 font-medium">کانال</th>
                      <th className="text-right px-4 py-3 font-medium">پشتیبان</th>
                      <th className="text-right px-4 py-3 font-medium">گیرنده</th>
                      <th className="text-right px-4 py-3 font-medium">قالب</th>
                      <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                      <th className="text-right px-4 py-3 font-medium">زمان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3"><StatusBadge value={l.channel} /></td>
                        <td className="px-4 py-3 text-xs font-mono">{l.provider}</td>
                        <td className="px-4 py-3 text-xs">{l.recipient}</td>
                        <td className="px-4 py-3 text-xs font-mono">{l.templateCode ?? "—"}</td>
                        <td className="px-4 py-3"><StatusBadge value={l.status} /></td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ساخت قالب پیام</DialogTitle>
            <DialogDescription>از متغیرهای {{name}} در متن استفاده کنید.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">کانال</Label>
                <Select value={tplChannel} onValueChange={(v: typeof tplChannel) => setTplChannel(v)}>
                  <SelectTrigger className="mt-1.5 bg-card/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">کد قالب</Label>
                <Input value={tplCode} onChange={(e) => setTplCode(e.target.value)} placeholder="welcome_sms" className="mt-1.5 bg-card/40 font-mono" />
              </div>
            </div>
            <div>
              <Label className="text-xs">نام</Label>
              <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="پیام خوش‌آمد" className="mt-1.5 bg-card/40" />
            </div>
            <div>
              <Label className="text-xs">عنوان (فقط ایمیل)</Label>
              <Input value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} placeholder="خوش آمدید به اپ" className="mt-1.5 bg-card/40" />
            </div>
            <div>
              <Label className="text-xs">متن</Label>
              <textarea value={tplBody} onChange={(e) => setTplBody(e.target.value)} rows={5} placeholder="سلام {{name}} عزیز، خوش آمدید!" className="mt-1.5 w-full rounded-md border border-border bg-card/40 px-3 py-2 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button onClick={handleCreateTemplate} disabled={creating} className="gap-2">
              {creating && <Loader2 className="size-4 animate-spin" />} ساخت قالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ارسال دستی پیام</DialogTitle>
            <DialogDescription>تست ارسال با پشتیبان mock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">کانال</Label>
              <Select value={sendChannel} onValueChange={(v: typeof sendChannel) => setSendChannel(v)}>
                <SelectTrigger className="mt-1.5 bg-card/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">کد قالب (اختیاری)</Label>
              <Input value={sendTemplateCode} onChange={(e) => setSendTemplateCode(e.target.value)} placeholder="welcome_sms" className="mt-1.5 bg-card/40 font-mono" />
            </div>
            <div>
              <Label className="text-xs">گیرنده (شماره/ایمیل/device token)</Label>
              <Input value={sendRecipient} onChange={(e) => setSendRecipient(e.target.value)} placeholder="+98912..." className="mt-1.5 bg-card/40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>انصراف</Button>
            <Button onClick={handleSend} disabled={sending} className="gap-2">
              {sending && <Loader2 className="size-4 animate-spin" />} ارسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
