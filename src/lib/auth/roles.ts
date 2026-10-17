import { err } from "@/lib/api/response";
import type { OrgRole } from "@/lib/auth/authorization";

/**
 * Dashboard authorization.
 * - read: every member, including viewer
 * - write: owner, admin, developer (not viewer, not billing)
 * - credentials: owner and admin only — developer cannot create, rotate, or revoke keys
 * - admin: owner and admin (quotas and other org-level limits)
 * - operate: any member except viewer (try-it-out, cancel subscription)
 */
export type DashboardAction = "read" | "write" | "credentials" | "admin" | "operate";

const ALLOWED: Record<DashboardAction, readonly OrgRole[]> = {
  read: ["owner", "admin", "developer", "billing", "viewer"],
  write: ["owner", "admin", "developer"],
  credentials: ["owner", "admin"],
  admin: ["owner", "admin"],
  operate: ["owner", "admin", "developer", "billing"],
};

const DENIED: Record<DashboardAction, string> = {
  read: "نقش شما اجازه مشاهده را نمی‌دهد.",
  write: "نقش شما اجازه این تغییر را نمی‌دهد.",
  credentials: "فقط مدیر سازمان می‌تواند کلید را بسازد، بچرخاند یا ابطال کند.",
  admin: "فقط مدیر سازمان می‌تواند این تنظیم را تغییر دهد.",
  operate: "نقش شما اجازه این عملیات را نمی‌دهد.",
};

export function roleAllows(role: string, action: DashboardAction): boolean {
  return (ALLOWED[action] as readonly string[]).includes(role);
}

export function rejectRole(role: string, action: DashboardAction): Response | null {
  if (roleAllows(role, action)) return null;
  return err("FORBIDDEN", DENIED[action], 403);
}
