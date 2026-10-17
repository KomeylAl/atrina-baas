"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateShort, timeAgo } from "@/lib/utils/format";

type CredentialRow = {
  id: string;
  name: string;
  keyPrefix: string;
  kind: string;
  status: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  environment: { id: string; name: string; slug: string; project: { id: string; name: string; slug: string } };
};

export function CredentialsView() {
  // We don't have a direct "all credentials" endpoint, so we show a placeholder with explanation.
  // For each project/env, the user can navigate via Projects view. This is a "summary" view.
  const { data, isLoading } = useQuery<{ credentials: CredentialRow[] }>({
    queryKey: ["all-credentials"],
    queryFn: async () => {
      // List orgs → projects → envs → credentials, flatten
      const orgsRes = await fetch("/api/organizations");
      const orgsJson = await orgsRes.json();
      const orgs = (orgsJson.data?.organizations ?? orgsJson.organizations ?? []) as Array<{ id: string }>;
      const all: CredentialRow[] = [];
      for (const o of orgs) {
        const projsRes = await fetch(`/api/organizations/${o.id}/projects`);
        const projsJson = await projsRes.json();
        const projects = (projsJson.data?.projects ?? projsJson.projects ?? []) as Array<{ id: string; name: string; slug: string }>;
        for (const p of projects) {
          const envsRes = await fetch(`/api/projects/${p.id}/environments`);
          // reuse the project detail: we have environments there
          const projectRes = await fetch(`/api/projects/${p.id}`);
          const projectJson = await projectRes.json();
          const envs = projectJson.data?.project?.environments ?? [];
          for (const e of envs) {
            const credsRes = await fetch(`/api/environments/${e.id}/credentials`);
            const credsJson = await credsRes.json();
            const creds = (credsJson.data?.credentials ?? []) as CredentialRow[];
            for (const c of creds) {
              all.push({
                ...c,
                environment: { id: e.id, name: e.name, slug: e.slug, project: { id: p.id, name: p.name, slug: p.slug } },
              });
            }
          }
        }
      }
      return { credentials: all };
    },
  });

  const creds = data?.credentials ?? [];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">همه کلیدهای API</h2>
        <p className="text-sm text-muted-foreground mt-1">
          نمای کلی از کلیدهای API در تمام پروژه‌ها و محیط‌ها
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="size-6 animate-spin mx-auto" />
        </div>
      ) : creds.length === 0 ? (
        <Card className="bg-card/40">
          <CardContent className="p-10 text-center">
            <KeyRound className="size-10 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-1">هنوز کلیدی صادر نشده</h3>
            <p className="text-sm text-muted-foreground">
              برای صدور کلید، به یک پروژه بروید و در محیط دلخواه کلید بسازید.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/40 border-border/60">
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="text-right px-4 py-3 font-medium">نام</th>
                  <th className="text-right px-4 py-3 font-medium">پیشوند</th>
                  <th className="text-right px-4 py-3 font-medium">نوع</th>
                  <th className="text-right px-4 py-3 font-medium">محیط</th>
                  <th className="text-right px-4 py-3 font-medium">پروژه</th>
                  <th className="text-right px-4 py-3 font-medium">آخرین استفاده</th>
                  <th className="text-right px-4 py-3 font-medium">انقضا</th>
                  <th className="text-right px-4 py-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {creds.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.keyPrefix}</td>
                    <td className="px-4 py-3"><StatusBadge value={c.kind} /></td>
                    <td className="px-4 py-3 text-xs">{c.environment.name}</td>
                    <td className="px-4 py-3 text-xs">{c.environment.project.name}</td>
                    <td className="px-4 py-3 text-xs">{c.lastUsedAt ? timeAgo(c.lastUsedAt) : "—"}</td>
                    <td className="px-4 py-3 text-xs">{c.expiresAt ? formatDateShort(c.expiresAt) : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge value={c.status} /></td>
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
