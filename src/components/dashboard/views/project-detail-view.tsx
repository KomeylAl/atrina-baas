"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Loader2,
  KeyRound,
  Layers,
  ArrowLeft,
  Globe,
  Hash,
  Activity,
  ShieldCheck,
  Calendar,
  RotateCw,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Users,
  Database,
  CreditCard,
  HardDrive,
  Bell,
  Webhook,
  Gauge,
  Code2,
} from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber, formatDateShort, timeAgo } from "@/lib/utils/format";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toPersianDigits } from "@/lib/utils/format";
import { useAuth } from "@/stores/auth-store";
import { UsersSection } from "@/components/dashboard/sections/users-section";
import { DataSection } from "@/components/dashboard/sections/data-section";
import { BillingSection } from "@/components/dashboard/sections/billing-section";
import { StorageSection } from "@/components/dashboard/sections/storage-section";
import { NotificationsSection } from "@/components/dashboard/sections/notifications-section";
import { WebhooksSection } from "@/components/dashboard/sections/webhooks-section";
import { QuotasSection } from "@/components/dashboard/sections/quotas-section";
import { ApiReferenceSection } from "@/components/dashboard/sections/api-reference-section";

type ProjectDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  createdAt: string;
  environments: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    _count: { credentials: number };
  }>;
  _count: { auditLogs: number };
};

type Credential = {
  id: string;
  name: string;
  keyPrefix: string;
  kind: string;
  scopes: string | null;
  status: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type AuditLogItem = {
  id: string;
  action: string;
  actorType: string;
  actor: { id: string; email: string; displayName: string | null } | null;
  resourceType: string | null;
  resourceId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export function ProjectDetailView({
  projectId,
  envId,
  tab = "overview",
  onTabChange,
  onEnvChange,
}: {
  projectId: string;
  envId?: string;
  tab?: string;
  onTabChange?: (tab: string) => void;
  onEnvChange?: (envId: string) => void;
}) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(tab);
  const [createEnvOpen, setCreateEnvOpen] = useState(false);
  const [newEnvName, setNewEnvName] = useState("");
  const [newEnvType, setNewEnvType] = useState<"development" | "staging" | "production" | "custom">("custom");
  const [creatingEnv, setCreatingEnv] = useState(false);

  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(envId ?? null);
  const [selectedCredentialSecret, setSelectedCredentialSecret] = useState<string | null>(null);

  const { data: projectData, isLoading: projectLoading } = useQuery<{ project: ProjectDetail }>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message ?? "خطا در دریافت پروژه");
      return { project: json.data.project as ProjectDetail };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  // Auto-select first env if none chosen (after data loads)
  const project = projectData?.project;
  const firstEnvId = project?.environments?.[0]?.id ?? null;
  useEffect(() => {
    if (tab !== activeTab) setActiveTab(tab);
  }, [tab, activeTab]);

  useEffect(() => {
    if (envId && envId !== selectedEnvId) setSelectedEnvId(envId);
  }, [envId, selectedEnvId]);

  useEffect(() => {
    if (firstEnvId && !selectedEnvId && !envId) {
      requestAnimationFrame(() => {
        setSelectedEnvId(firstEnvId);
        onEnvChange?.(firstEnvId);
      });
    }
  }, [firstEnvId, selectedEnvId, envId, onEnvChange]);

  const { data: credentialsData, isLoading: credentialsLoading } = useQuery<{ credentials: Credential[] }>({
    queryKey: ["env-credentials", selectedEnvId],
    queryFn: async () => {
      if (!selectedEnvId) return { credentials: [] as Credential[] };
      const r = await fetch(`/api/environments/${selectedEnvId}/credentials`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message ?? "خطا");
      return { credentials: (json.data?.credentials ?? []) as Credential[] };
    },
    enabled: !!selectedEnvId,
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const { data: auditData } = useQuery<{ logs: AuditLogItem[] }>({
    queryKey: ["project-audit", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/audit-logs`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message ?? "خطا");
      return { logs: (json.data?.logs ?? []) as AuditLogItem[] };
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  const { data: usageData } = useQuery({
    queryKey: ["project-usage", projectId],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/usage`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message ?? "خطا");
      return json.data;
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleCreateEnv() {
    if (creatingEnv) return;
    if (newEnvName.trim().length < 2) {
      toast.error("نام باید حداقل ۲ کاراکتر باشد");
      return;
    }
    setCreatingEnv(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/environments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newEnvName.trim(), type: newEnvType }),
      });
      const json = await r.json();
      if (!r.ok) {
        toast.error(json.error?.message ?? "خطا");
        return;
      }
      toast.success("محیط ساخته شد");
      setCreateEnvOpen(false);
      setNewEnvName("");
      qc.invalidateQueries({ queryKey: ["project", projectId] });
    } finally {
      setCreatingEnv(false);
    }
  }

  if (projectLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin mx-auto" />
      </div>
    );
  }
  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">پروژه یافت نشد.</div>;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Project header */}
      <div className="glass-panel rounded-2xl p-6 border border-border/60">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-info/15 flex items-center justify-center text-info">
              <Layers className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{project.name}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Hash className="size-3" />{project.slug}</span>
                <StatusBadge value={project.status} />
                <span className="flex items-center gap-1"><Calendar className="size-3" />{formatDateShort(project.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border/60">
            {project.description}
          </p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(next) => { setActiveTab(next); onTabChange?.(next); }}>
        <TabsList className="bg-card/40 border border-border/60 flex-wrap h-auto">
          <TabsTrigger value="overview" className="gap-1.5">
            <Layers className="size-3.5" />
            محیط‌ها
          </TabsTrigger>
          <TabsTrigger value="credentials" className="gap-1.5">
            <KeyRound className="size-3.5" />
            کلیدها
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="size-3.5" />
            کاربران
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="size-3.5" />
            داده
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5">
            <CreditCard className="size-3.5" />
            صورتحساب
          </TabsTrigger>
          <TabsTrigger value="storage" className="gap-1.5">
            <HardDrive className="size-3.5" />
            ذخیره‌سازی
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="size-3.5" />
            نوتیفیکیشن
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1.5">
            <Webhook className="size-3.5" />
            وب‌هوک
          </TabsTrigger>
          <TabsTrigger value="quotas" className="gap-1.5">
            <Gauge className="size-3.5" />
            سهمیه
          </TabsTrigger>
          <TabsTrigger value="api-reference" className="gap-1.5">
            <Code2 className="size-3.5" />
            مرجع API
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ShieldCheck className="size-3.5" />
            ممیزی
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-1.5">
            <Activity className="size-3.5" />
            استفاده
          </TabsTrigger>
        </TabsList>

        {/* Environments tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">محیط‌ها</h3>
            <Button onClick={() => setCreateEnvOpen(true)} size="sm" className="gap-2">
              <Plus className="size-4" />
              محیط جدید
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.environments.map((env) => (
              <Card
                key={env.id}
                className={`bg-card/40 border-border/60 cursor-pointer transition-all hover:border-primary/40 ${
                  selectedEnvId === env.id ? "border-primary ring-1 ring-primary/30" : ""
                }`}
              >
                <CardHeader className="flex-row items-start justify-between pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                      <Globe className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm">{env.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Hash className="size-3" />
                        {env.slug}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge value={env.type} />
                </CardHeader>
                <CardContent className="text-xs">
                  <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                    <span className="text-muted-foreground">{formatNumber(env._count.credentials)} کلید</span>
                    <StatusBadge value={env.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Credentials tab */}
        <TabsContent value="credentials" className="space-y-4 mt-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="font-semibold">کلیدهای API محیط</h3>
              <p className="text-sm text-muted-foreground mt-1">
                کلیدها فقط یک بار در زمان ساخت نمایش داده می‌شوند.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedEnvId ?? undefined}
                onValueChange={(v) => { setSelectedEnvId(v); onEnvChange?.(v); }}
              >
                <SelectTrigger className="w-44 bg-card/40">
                  <SelectValue placeholder="انتخاب محیط" />
                </SelectTrigger>
                <SelectContent>
                  {project.environments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CreateCredentialDialog
                projectId={projectId}
                envId={selectedEnvId}
                disabled={!selectedEnvId}
                onCreated={() => {
                  qc.invalidateQueries({ queryKey: ["env-credentials", selectedEnvId] });
                  qc.invalidateQueries({ queryKey: ["project", projectId] });
                }}
              />
            </div>
          </div>

          {credentialsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mx-auto" />
            </div>
          ) : !selectedEnvId ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              یک محیط را برای مشاهده کلیدها انتخاب کنید.
            </div>
          ) : (credentialsData?.credentials ?? []).length === 0 ? (
            <Card className="bg-card/40">
              <CardContent className="p-8 text-center">
                <KeyRound className="size-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">هیچ کلیدی برای این محیط صادر نشده است.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(credentialsData?.credentials ?? []).map((c) => (
                <Card key={c.id} className="bg-card/40 border-border/60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
                          c.kind === "publishable" ? "bg-info/15 text-info" :
                          c.kind === "server_secret" ? "bg-warning/15 text-warning" :
                          "bg-destructive/15 text-destructive"
                        }`}>
                          <KeyRound className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate font-mono">{c.keyPrefix}</div>
                        </div>
                      </div>
                      <StatusBadge value={c.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/60 pt-3">
                      <div>
                        <div className="text-muted-foreground mb-0.5">نوع</div>
                        <StatusBadge value={c.kind} />
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-0.5">آخرین استفاده</div>
                        <div>{c.lastUsedAt ? timeAgo(c.lastUsedAt) : "—"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-0.5">انقضا</div>
                        <div>{c.expiresAt ? formatDateShort(c.expiresAt) : "بدون انقضا"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-0.5">ساخت</div>
                        <div>{formatDateShort(c.createdAt)}</div>
                      </div>
                    </div>
                    {c.status === "active" && (
                      <div className="flex items-center gap-2 mt-3 border-t border-border/60 pt-3">
                        <RotateButton credId={c.id} credName={c.name} projectId={projectId} onDone={() => {
                          qc.invalidateQueries({ queryKey: ["env-credentials", selectedEnvId] });
                          qc.invalidateQueries({ queryKey: ["project", projectId] });
                        }} />
                        <RevokeButton credId={c.id} credName={c.name} onDone={() => {
                          qc.invalidateQueries({ queryKey: ["env-credentials", selectedEnvId] });
                          qc.invalidateQueries({ queryKey: ["project", projectId] });
                        }} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Users tab */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <UsersSection projectId={projectId} environments={project.environments} />
        </TabsContent>

        {/* Data tab */}
        <TabsContent value="data" className="space-y-4 mt-4">
          <DataSection projectId={projectId} environments={project.environments} />
        </TabsContent>

        {/* Billing tab */}
        <TabsContent value="billing" className="space-y-4 mt-4">
          <BillingSection projectId={projectId} environments={project.environments} />
        </TabsContent>

        {/* Storage tab */}
        <TabsContent value="storage" className="space-y-4 mt-4">
          <StorageSection projectId={projectId} environments={project.environments} apiKey={selectedCredentialSecret} />
        </TabsContent>

        {/* Notifications tab */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <NotificationsSection projectId={projectId} environments={project.environments} />
        </TabsContent>

        {/* Webhooks tab */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <WebhooksSection projectId={projectId} environments={project.environments} />
        </TabsContent>

        {/* Quotas tab */}
        <TabsContent value="quotas" className="space-y-4 mt-4">
          <QuotasSection projectId={projectId} environments={project.environments} />
        </TabsContent>

        {/* API Reference tab */}
        <TabsContent value="api-reference" className="space-y-4 mt-4">
          <ApiReferenceSection projectId={projectId} />
        </TabsContent>

        {/* Audit tab */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <h3 className="font-semibold">رویدادهای این پروژه</h3>
          <Card className="bg-card/40 border-border/60">
            <CardContent className="p-0">
              {(auditData?.logs ?? []).length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  هنوز رویدادی ثبت نشده است.
                </div>
              ) : (
                <ul className="divide-y divide-border/60 max-h-[60vh] overflow-y-auto">
                  {(auditData?.logs ?? []).map((log) => (
                    <li key={log.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <ShieldCheck className="size-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium font-mono text-xs">{log.action}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {log.actor?.email ?? "system"}
                            {log.resourceType && ` · ${log.resourceType}`}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage tab */}
        <TabsContent value="usage" className="space-y-4 mt-4">
          <h3 className="font-semibold">آمار استفاده (۳۰ روز اخیر)</h3>
          {usageData?.byMetric && Object.keys(usageData.byMetric).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(usageData.byMetric).map(([metric, total]) => (
                <Card key={metric} className="bg-card/40 border-border/60">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground mb-1 font-mono">{metric}</div>
                    <div className="text-2xl font-bold">{formatNumber(total as number)}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              هنوز داده‌ی استفاده‌ای ثبت نشده است.
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create env dialog */}
      <Dialog open={createEnvOpen} onOpenChange={setCreateEnvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ساخت محیط جدید</DialogTitle>
            <DialogDescription>
              محیط‌ها برای ایزوله کردن تنظیمات و داده‌ها بین مراحل توسعه، پیش‌تولید و تولید استفاده می‌شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="env-name">نام محیط</Label>
              <Input
                id="env-name"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="مثلاً: Staging"
                className="mt-1.5 bg-card/40"
                autoFocus
              />
            </div>
            <div>
              <Label>نوع محیط</Label>
              <Select value={newEnvType} onValueChange={(v: typeof newEnvType) => setNewEnvType(v)}>
                <SelectTrigger className="mt-1.5 bg-card/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">توسعه</SelectItem>
                  <SelectItem value="staging">پیش‌تولید</SelectItem>
                  <SelectItem value="production">تولید</SelectItem>
                  <SelectItem value="custom">سفارشی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateEnvOpen(false)}>انصراف</Button>
            <Button onClick={handleCreateEnv} disabled={creatingEnv} className="gap-2">
              {creatingEnv && <Loader2 className="size-4 animate-spin" />}
              ساخت محیط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------
// Sub-components
// ------------------------------------------------------------

function CreateCredentialDialog({
  projectId,
  envId,
  disabled,
  onCreated,
}: {
  projectId: string;
  envId: string | null;
  disabled?: boolean;
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"publishable" | "server_secret" | "admin">("publishable");
  const [scopesInput, setScopesInput] = useState("read");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<{ secret: string; warning?: string } | null>(null);
  const [showSecret, setShowSecret] = useState(true);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setKind("publishable");
    setScopesInput("read");
    setExpiresInDays("");
    setResult(null);
    setShowSecret(true);
    setCopied(false);
  }

  async function handleCreate() {
    if (creating) return;
    if (name.trim().length < 2) {
      toast.error("نام باید حداقل ۲ کاراکتر باشد");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch(`/api/environments/${envId}/credentials`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          scopes: scopesInput.split(",").map((s) => s.trim()).filter(Boolean),
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        }),
      });
      const json = await r.json();
      if (!r.ok) {
        toast.error(json.error?.message ?? "خطا");
        return;
      }
      setResult(json.data);
      toast.success("کلید ساخته شد");
      onCreated();
      qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
    } finally {
      setCreating(false);
    }
  }

  function copySecret() {
    if (!result) return;
    navigator.clipboard.writeText(result.secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("در کلیپ‌بورد کپی شد");
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        disabled={disabled}
        className="gap-2"
      >
        <Plus className="size-4" />
        صدور کلید
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className={result ? "sm:max-w-lg" : ""}>
          {!result ? (
            <>
              <DialogHeader>
                <DialogTitle>صدور کلید جدید</DialogTitle>
                <DialogDescription>
                  کلید فقط یک بار در زمان ساخت نمایش داده می‌شود. آن را در محل امنی ذخیره کنید.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="cred-name">نام کلید</Label>
                  <Input
                    id="cred-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً: کلید سرور موبایل"
                    className="mt-1.5 bg-card/40"
                    autoFocus
                  />
                </div>
                <div>
                  <Label>نوع کلید</Label>
                  <Select value={kind} onValueChange={(v: typeof kind) => setKind(v)}>
                    <SelectTrigger className="mt-1.5 bg-card/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="publishable">عمومی (Publishable) — برای کلاینت</SelectItem>
                      <SelectItem value="server_secret">سرور (Server Secret) — فقط سمت سرور</SelectItem>
                      <SelectItem value="admin">مدیر (Admin) — خطرناک، محدود</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cred-scopes">اسکوپ‌ها (با کاما جدا کنید)</Label>
                  <Input
                    id="cred-scopes"
                    value={scopesInput}
                    onChange={(e) => setScopesInput(e.target.value)}
                    placeholder="read,write"
                    className="mt-1.5 bg-card/40"
                  />
                </div>
                <div>
                  <Label htmlFor="cred-exp">انقضا (روز، اختیاری)</Label>
                  <Input
                    id="cred-exp"
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="خالی = بدون انقضا"
                    className="mt-1.5 bg-card/40"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
                <Button onClick={handleCreate} disabled={creating} className="gap-2">
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  صدور کلید
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>کلید ساخته شد</DialogTitle>
                <DialogDescription>این کلید را همین حالا در یک محل امن کپی کنید. دیگر قابل مشاهده نیست.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="relative">
                  <div className="font-mono text-xs bg-card border border-border/60 rounded-lg p-3 pr-10 break-all leading-relaxed">
                    {showSecret ? result.secret : "•".repeat(48)}
                  </div>
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <button
                      onClick={() => setShowSecret((s) => !s)}
                      className="size-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                    >
                      {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                    <button
                      onClick={copySecret}
                      className="size-7 rounded flex items-center justify-center hover:bg-muted text-muted-foreground"
                    >
                      {copied ? <X className="size-3.5" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning-foreground">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-warning" />
                  <span>{result.warning}</span>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)} className="gap-2">
                  متوجه شدم
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RotateButton({
  credId,
  credName,
  projectId,
  onDone,
}: {
  credId: string;
  credName: string;
  projectId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ secret: string } | null>(null);

  async function handleRotate() {
    setBusy(true);
    try {
      const r = await fetch(`/api/credentials/${credId}/rotate`, {
        method: "POST",
      });
      const json = await r.json();
      if (!r.ok) {
        toast.error(json.error?.message ?? "خطا در چرخش کلید");
        return;
      }
      setResult(json.data);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs"
      >
        <RotateCw className="size-3.5" />
        چرخش
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
        <DialogContent>
          {!result ? (
            <>
              <DialogHeader>
                <DialogTitle>چرخش کلید «{credName}»</DialogTitle>
                <DialogDescription>
                  این عملیات کلید قبلی را ابطال کرده و یک کلید جدید صادر می‌کند. این عمل قابل بازگشت نیست.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
                <Button onClick={handleRotate} disabled={busy} variant="destructive" className="gap-2">
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  چرخش کلید
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>کلید جدید صادر شد</DialogTitle>
                <DialogDescription>این کلید جدید را در یک محل امن ذخیره کنید.</DialogDescription>
              </DialogHeader>
              <div className="font-mono text-xs bg-card border border-border/60 rounded-lg p-3 break-all leading-relaxed">
                {result.secret}
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(result.secret);
                    toast.success("در کلیپ‌بورد کپی شد");
                  }}
                  className="gap-2"
                >
                  <Copy className="size-4" />
                  کپی کلید
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>بستن</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RevokeButton({ credId, credName, onDone }: { credId: string; credName: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleRevoke() {
    setBusy(true);
    try {
      const r = await fetch(`/api/credentials/${credId}/revoke`, { method: "POST" });
      const json = await r.json();
      if (!r.ok) {
        toast.error(json.error?.message ?? "خطا");
        return;
      }
      toast.success("کلید ابطال شد");
      setOpen(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-3.5" />
        ابطال
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ابطال کلید «{credName}»</DialogTitle>
            <DialogDescription>
              این کلید دیگر قابل استفاده نخواهد بود. این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
            <Button onClick={handleRevoke} disabled={busy} variant="destructive" className="gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />}
              ابطال کلید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
