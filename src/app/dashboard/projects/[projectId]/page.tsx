"use client";

import { Suspense } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProjectDetailView } from "@/components/dashboard/views/project-detail-view";

function ProjectPageInner() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "overview";
  const envId = searchParams.get("env");

  function update(next: { tab?: string; envId?: string | null }) {
    const sp = new URLSearchParams(searchParams.toString());
    const nextTab = next.tab ?? tab;
    if (!nextTab || nextTab === "overview") sp.delete("tab");
    else sp.set("tab", nextTab);
    if (next.envId) sp.set("env", next.envId);
    const href = `${pathname}?${sp.toString()}`;
    const current = `${pathname}?${searchParams.toString()}`;
    if (href !== current) router.replace(href);
  }

  return (
    <ProjectDetailView
      projectId={params.projectId}
      envId={envId ?? undefined}
      tab={tab}
      onTabChange={(next) => update({ tab: next })}
      onEnvChange={(next) => update({ envId: next })}
    />
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={null}>
      <ProjectPageInner />
    </Suspense>
  );
}
