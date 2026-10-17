export type View =
  | { name: "overview" }
  | { name: "organizations" }
  | { name: "projects" }
  | { name: "project-detail"; projectId: string; envId?: string; tab?: string }
  | { name: "credentials" }
  | { name: "sdk-center" }
  | { name: "audit-logs" }
  | { name: "usage" }
  | { name: "settings" };

export function viewHref(view: View, orgId: string | null): string {
  const sp = new URLSearchParams();
  if (orgId) sp.set("org", orgId);
  let path = "/dashboard";
  switch (view.name) {
    case "organizations":
      path = "/dashboard/organizations";
      break;
    case "projects":
      path = "/dashboard/projects";
      break;
    case "project-detail":
      path = `/dashboard/projects/${view.projectId}`;
      if (view.tab && view.tab !== "overview") sp.set("tab", view.tab);
      if (view.envId) sp.set("env", view.envId);
      break;
    case "credentials":
      path = "/dashboard/credentials";
      break;
    case "sdk-center":
      path = "/dashboard/sdk";
      break;
    case "audit-logs":
      path = "/dashboard/audit";
      break;
    case "usage":
      path = "/dashboard/usage";
      break;
    case "settings":
      path = "/dashboard/settings";
      break;
    case "overview":
      path = "/dashboard";
      break;
  }
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}

export function viewFromPath(pathname: string): View {
  if (pathname.startsWith("/dashboard/organizations")) return { name: "organizations" };
  if (pathname.startsWith("/dashboard/projects/")) {
    const projectId = pathname.split("/")[3] ?? "";
    return { name: "project-detail", projectId };
  }
  if (pathname.startsWith("/dashboard/projects")) return { name: "projects" };
  if (pathname.startsWith("/dashboard/credentials")) return { name: "credentials" };
  if (pathname.startsWith("/dashboard/sdk")) return { name: "sdk-center" };
  if (pathname.startsWith("/dashboard/audit")) return { name: "audit-logs" };
  if (pathname.startsWith("/dashboard/usage")) return { name: "usage" };
  if (pathname.startsWith("/dashboard/settings")) return { name: "settings" };
  return { name: "overview" };
}

/** Sidebar highlight. Project detail stays under Projects. */
export function navIdForView(view: View): View["name"] {
  return view.name === "project-detail" ? "projects" : view.name;
}
