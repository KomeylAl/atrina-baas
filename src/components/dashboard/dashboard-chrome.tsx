"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { viewFromPath, viewHref, type View } from "@/lib/dashboard/routes";
import { Loader2 } from "lucide-react";

const NavigateContext = createContext<(view: View) => void>(() => {});

export function useDashboardNavigate() {
  return useContext(NavigateContext);
}

export function DashboardChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuth((s) => s.user);
  const fetchUser = useAuth((s) => s.fetchUser);
  const logout = useAuth((s) => s.logout);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchUser().finally(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchUser]);

  const requestedOrg = searchParams.get("org");
  const memberships = user?.memberships.filter((m) => m.status === "active") ?? [];
  const activeOrgId = memberships.some((m) => m.organization.id === requestedOrg)
    ? requestedOrg
    : memberships[0]?.organization.id ?? null;

  useEffect(() => {
    if (!user || !activeOrgId || requestedOrg === activeOrgId) return;
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("org", activeOrgId);
    router.replace(`${pathname}?${sp.toString()}`);
  }, [user, activeOrgId, requestedOrg, pathname, router, searchParams]);

  useEffect(() => {
    if (sessionReady && !user) router.replace("/");
  }, [sessionReady, user, router]);

  const pathView = viewFromPath(pathname);
  const view: View =
    pathView.name === "project-detail"
      ? {
          ...pathView,
          tab: searchParams.get("tab") ?? undefined,
          envId: searchParams.get("env") ?? undefined,
        }
      : pathView;

  function navigate(next: View) {
    router.push(viewHref(next, activeOrgId));
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <NavigateContext.Provider value={navigate}>
      <div className="h-svh overflow-hidden flex bg-background">
        <Sidebar
          view={view.name === "project-detail" ? { name: "projects" } : view}
          onNavigate={navigate}
          activeOrgId={activeOrgId}
          onSelectOrg={(id) => {
            const sp = new URLSearchParams(searchParams.toString());
            sp.set("org", id);
            router.replace(`${pathname}?${sp.toString()}`);
          }}
          onLogout={async () => {
            await logout();
            router.replace("/");
          }}
        />
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <Topbar view={view} onNavigate={navigate} />
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
      </div>
    </NavigateContext.Provider>
  );
}
