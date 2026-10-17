"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ProjectsView } from "@/components/dashboard/views/projects-view";
import { useDashboardNavigate } from "@/components/dashboard/dashboard-chrome";

function ProjectsPageInner() {
  const navigate = useDashboardNavigate();
  const orgId = useSearchParams().get("org");
  return <ProjectsView activeOrgId={orgId} onNavigate={navigate} />;
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}
