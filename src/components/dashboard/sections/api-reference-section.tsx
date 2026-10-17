"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Code2,
  Copy,
  Loader2,
  Check,
  Play,
  Globe,
  KeyRound,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { SectionLoading, EnvPicker, SectionHeader } from "@/components/dashboard/widgets/common";
import { generateSnippet, SNIPPET_LANGS, type SnippetLang, type SnippetInput } from "@/lib/api/snippets";

type Endpoint = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  category: string;
  title: string;
  description: string;
  auth: "publishable" | "user" | "server" | "none";
  pathParams?: Array<{ name: string; description: string }>;
  queryParams?: Array<{ name: string; type: string; description: string }>;
  bodySchema?: string;
  responseSchema?: string;
  exampleResponse?: string;
  tryable?: boolean;
};

type ApiResponse = {
  baseUrl: string;
  env: { id: string; name: string; slug: string; type: string };
  environments: Array<{ id: string; name: string; slug: string; type: string }>;
  publishableKeyPrefix: string;
  endpoints: Endpoint[];
};

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-info/15 text-info border-info/30",
  POST: "bg-success/15 text-success border-success/30",
  PATCH: "bg-warning/15 text-warning border-warning/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

const AUTH_LABELS: Record<string, { label: string; color: string }> = {
  publishable: { label: "publishable key", color: "bg-info/10 text-info" },
  user: { label: "user token", color: "bg-primary/10 text-primary" },
  server: { label: "server secret", color: "bg-warning/10 text-warning" },
  none: { label: "بدون احراز", color: "bg-muted text-muted-foreground" },
};

export function ApiReferenceSection({ projectId }: { projectId: string }) {
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [tryOpen, setTryOpen] = useState<Endpoint | null>(null);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["api-reference", projectId, selectedEnvId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedEnvId) params.set("envId", selectedEnvId);
      const r = await fetch(`/api/projects/${projectId}/api-reference?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return json.data;
    },
    staleTime: 30_000,
    refetchOnMount: true,
    retry: 1,
  });

  // Group endpoints by category
  const grouped = useMemo(() => {
    const map = new Map<string, Endpoint[]>();
    for (const ep of data?.endpoints ?? []) {
      if (!map.has(ep.category)) map.set(ep.category, []);
      map.get(ep.category)!.push(ep);
    }
    return Array.from(map.entries());
  }, [data]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="مرجع API"
        description="همه‌ی endpointهای پروژه با نمونه‌ی کد در ۶ زبان و امکان تست زنده"
      />

      {/* Base URL + key info */}
      {data && (
        <Card className="bg-card/40 border-border/60">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <span className="text-xs text-muted-foreground">Base URL</span>
              <code className="text-sm font-mono bg-muted/30 px-2 py-0.5 rounded">{data.baseUrl}</code>
            </div>
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-info" />
              <span className="text-xs text-muted-foreground">کلید publishable نمونه</span>
              <code className="text-sm font-mono bg-muted/30 px-2 py-0.5 rounded">{data.publishableKeyPrefix}</code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">محیط فعلی</span>
              <Badge variant="outline">{data.env.name}</Badge>
              <Badge variant="outline">{data.env.slug}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Env picker */}
      {data && (
        <EnvPicker
          environments={data.environments.map((e) => ({ id: e.id, name: e.name }))}
          value={selectedEnvId ?? data.env.id}
          onChange={setSelectedEnvId}
        />
      )}

      {/* Endpoints grouped */}
      {isLoading ? (
        <SectionLoading />
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, eps]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">{category}</h3>
              <div className="space-y-2">
                {eps.map((ep) => (
                  <EndpointCard
                    key={`${ep.method}-${ep.path}`}
                    ep={ep}
                    baseUrl={data?.baseUrl ?? ""}
                    expanded={expandedEndpoint === `${ep.method}-${ep.path}`}
                    onToggle={() => setExpandedEndpoint(
                      expandedEndpoint === `${ep.method}-${ep.path}` ? null : `${ep.method}-${ep.path}`
                    )}
                    onTry={() => setTryOpen(ep)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tryOpen && (
        <TryItOutDialog
          ep={tryOpen}
          projectId={projectId}
          environments={data?.environments ?? []}
          defaultEnvId={selectedEnvId ?? data?.env.id ?? ""}
          onClose={() => setTryOpen(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Endpoint card
// ============================================================

function EndpointCard({
  ep,
  baseUrl,
  expanded,
  onToggle,
  onTry,
}: {
  ep: Endpoint;
  baseUrl: string;
  expanded: boolean;
  onToggle: () => void;
  onTry: () => void;
}) {
  return (
    <Card className="bg-card/40 border-border/60">
      <CardContent className="p-0">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          className="w-full flex items-center gap-3 p-3 text-start cursor-pointer hover:bg-muted/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className={`text-xs font-mono font-bold px-2 py-1 rounded border w-16 text-center shrink-0 ${METHOD_COLORS[ep.method]}`}>
            {ep.method}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-mono truncate">{ep.path}</div>
            <div className="text-xs text-muted-foreground truncate">{ep.title} — {ep.description}</div>
          </div>
          <Badge className={`text-[10px] ${AUTH_LABELS[ep.auth].color}`}>{AUTH_LABELS[ep.auth].label}</Badge>
          {ep.tryable && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1 h-7 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onTry();
              }}
            >
              <Play className="size-3" /> تست
            </Button>
          )}
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
        {expanded && (
          <div className="border-t border-border/60 p-3 space-y-3">
            <EndpointDetails ep={ep} baseUrl={baseUrl} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EndpointDetails({ ep, baseUrl }: { ep: Endpoint; baseUrl: string }) {
  return (
    <div className="space-y-3">
      {ep.pathParams && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">پارامترهای مسیر</div>
          <ul className="text-xs space-y-0.5">
            {ep.pathParams.map((p) => (
              <li key={p.name} className="flex gap-2">
                <code className="font-mono bg-muted/30 px-1 rounded">{p.name}</code>
                <span className="text-muted-foreground">{p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ep.queryParams && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Query params</div>
          <ul className="text-xs space-y-0.5">
            {ep.queryParams.map((p) => (
              <li key={p.name} className="flex gap-2">
                <code className="font-mono bg-muted/30 px-1 rounded">{p.name}</code>
                <span className="text-muted-foreground">{p.type} — {p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {ep.bodySchema && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Body</div>
          <pre className="text-xs bg-card/60 border border-border/40 rounded p-2 overflow-x-auto font-mono" dir="ltr">{ep.bodySchema}</pre>
        </div>
      )}
      {ep.responseSchema && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Response</div>
          <pre className="text-xs bg-card/60 border border-border/40 rounded p-2 overflow-x-auto font-mono" dir="ltr">{ep.responseSchema}</pre>
        </div>
      )}
      <CodeSnippets ep={ep} baseUrl={baseUrl} />
    </div>
  );
}

function CodeSnippets({ ep, baseUrl }: { ep: Endpoint; baseUrl: string }) {
  const [lang, setLang] = useState<SnippetLang>("curl");
  const [copied, setCopied] = useState(false);

  // Build a sample snippet input
  const input: SnippetInput = {
    baseUrl,
    method: ep.method,
    path: ep.path,
    body: sampleBody(ep),
    apiKey: "<YOUR_PUBLISHABLE_KEY>",
    userToken: ep.auth === "user" ? "<USER_TOKEN>" : null,
  };

  const snippet = useMemo(() => generateSnippet(lang, input), [lang, input]);

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-muted-foreground">نمونه کد</div>
        <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={copy}>
          {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          {copied ? "کپی شد" : "کپی"}
        </Button>
      </div>
      <Tabs value={lang} onValueChange={(v) => setLang(v as SnippetLang)}>
        <TabsList className="bg-card/40 border border-border/60 h-auto flex-wrap">
          {SNIPPET_LANGS.map((l) => (
            <TabsTrigger key={l.id} value={l.id} className="text-xs gap-1.5">
              <Code2 className="size-3" />
              {l.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={lang} className="mt-2">
          <pre className="text-xs bg-card/60 border border-border/40 rounded p-3 overflow-x-auto font-mono leading-relaxed" dir="ltr">{snippet}</pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function sampleBody(ep: Endpoint): Record<string, unknown> | null {
  if (ep.method === "POST" && ep.path === "/auth/signup") {
    return { email: "user@example.com", password: "secret123", displayName: "کاربر نمونه" };
  }
  if (ep.method === "POST" && ep.path === "/auth/login") {
    return { email: "user@example.com", password: "secret123" };
  }
  if (ep.method === "POST" && ep.path === "/billing/purchases/verify") {
    return {
      planId: "<PLAN_ID>",
      purchaseToken: "demo_v_test001",
      storeProductId: "pro_monthly_v1",
      provider: "cafebazaar",
    };
  }
  if (ep.method === "POST" && ep.path.startsWith("/data/")) {
    return { /* filled with table-specific example if known */ };
  }
  if (ep.method === "PATCH" && ep.path.startsWith("/data/")) {
    return { /* partial update */ };
  }
  return null;
}

// ============================================================
// Try-it-out dialog
// ============================================================

function TryItOutDialog({
  ep,
  projectId,
  environments,
  defaultEnvId,
  onClose,
}: {
  ep: Endpoint;
  projectId: string;
  environments: Array<{ id: string; name: string; slug: string; type: string }>;
  defaultEnvId: string;
  onClose: () => void;
}) {
  const [envId, setEnvId] = useState(defaultEnvId);
  const [body, setBody] = useState("{}");
  const [pathParamValues, setPathParamValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number; body: unknown } | null>(null);

  // Get credentials for this env (filtered by endpoint's auth requirement)
  const requiredKind = ep.auth === "publishable" ? "publishable" : null;
  const { data: credentialsData } = useQuery<{ credentials: Array<{ id: string; name: string; kind: string }> }>({
    queryKey: ["env-credentials-try", envId, requiredKind],
    queryFn: async () => {
      const r = await fetch(`/api/environments/${envId}/credentials`);
      const json = await r.json();
      return json.data;
    },
    enabled: !!envId,
  });

  // Filter credentials by required kind for this endpoint
  const filteredCreds = (credentialsData?.credentials ?? []).filter((c) =>
    !requiredKind || c.kind === requiredKind || c.kind === "admin" || c.kind === "server_secret"
  );
  // Prefer publishable for auth:publishable, otherwise prefer server_secret
  const sortedCreds = [...filteredCreds].sort((a, b) => {
    if (requiredKind === "publishable") {
      if (a.kind === "publishable" && b.kind !== "publishable") return -1;
      if (b.kind === "publishable" && a.kind !== "publishable") return 1;
    } else {
      if (a.kind === "server_secret" && b.kind !== "server_secret") return -1;
      if (b.kind === "server_secret" && a.kind !== "server_secret") return 1;
    }
    return 0;
  });

  const [credentialId, setCredentialId] = useState<string>("");

  // Auto-select first matching credential
  useEffect(() => {
    if (sortedCreds.length && !credentialId) {
      setCredentialId(sortedCreds[0].id);
    }
  }, [sortedCreds, credentialId]);

  async function run() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      // Build path with path params substituted
      let actualPath = ep.path;
      if (ep.pathParams) {
        for (const p of ep.pathParams) {
          actualPath = actualPath.replace(`{${p.name}}`, pathParamValues[p.name] ?? "");
        }
      }
      let bodyPayload: unknown = undefined;
      if (ep.method === "POST" || ep.method === "PATCH") {
        try {
          bodyPayload = JSON.parse(body);
        } catch {
          setResult({ status: 0, body: "Body JSON نامعتبر است" });
          setLoading(false);
          return;
        }
      }
      const res = await fetch(`/api/projects/${projectId}/api-reference/try`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          environmentId: envId,
          credentialId,
          method: ep.method,
          path: actualPath,
          body: bodyPayload,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setResult({ status: json.data.status, body: json.data.body });
      } else {
        setResult({ status: res.status, body: json });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold px-2 py-1 rounded border ${METHOD_COLORS[ep.method]}`}>
              {ep.method}
            </span>
            <code className="font-mono text-sm" dir="ltr">{ep.path}</code>
          </DialogTitle>
          <DialogDescription>{ep.title} — {ep.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {/* Env */}
          <div>
            <Label className="text-xs">محیط</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {environments.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEnvId(e.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    envId === e.id ? "bg-primary text-primary-foreground border-primary" : "bg-card/40 text-muted-foreground border-border"
                  }`}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>

          {/* Credential */}
          <div>
            <Label className="text-xs">کلید API</Label>
            <select
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-border bg-card/40 px-3 py-1.5 text-sm"
            >
              {sortedCreds.length ? (
                sortedCreds.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.kind})</option>
                ))
              ) : (
                <option value="">کلیدی موجود نیست — در تب «کلیدها» بسازید</option>
              )}
            </select>
          </div>

          {/* Path params */}
          {ep.pathParams && ep.pathParams.length > 0 && (
            <div>
              <Label className="text-xs">پارامترهای مسیر</Label>
              <div className="space-y-2 mt-1.5">
                {ep.pathParams.map((p) => (
                  <div key={p.name}>
                    <Label className="text-[11px] text-muted-foreground">{p.name} — {p.description}</Label>
                    <Input
                      value={pathParamValues[p.name] ?? ""}
                      onChange={(e) => setPathParamValues((s) => ({ ...s, [p.name]: e.target.value }))}
                      placeholder={p.name}
                      className="bg-card/40 font-mono text-sm mt-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body for POST/PATCH */}
          {(ep.method === "POST" || ep.method === "PATCH") && (
            <div>
              <Label className="text-xs">Body (JSON)</Label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="mt-1.5 w-full rounded-md border border-border bg-card/40 px-3 py-2 text-sm font-mono"
                dir="ltr"
              />
            </div>
          )}

          <Button onClick={run} disabled={loading || !credentialId} className="w-full gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            ارسال درخواست
          </Button>

          {result && (
            <div>
              <Label className="text-xs">پاسخ (HTTP {result.status})</Label>
              <pre
                className="text-xs bg-card/60 border border-border/40 rounded p-3 overflow-x-auto font-mono mt-1.5"
                dir="ltr"
              >
                {typeof result.body === "string"
                  ? result.body
                  : JSON.stringify(result.body, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
