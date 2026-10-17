/**
 * Atrina BaaS — TypeScript types
 */

export type CredentialKind = "publishable" | "server_secret" | "admin";

export type ProjectUser = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  status: "active" | "blocked" | "pending" | "deleted";
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

export type AuthSession = {
  user: ProjectUser;
  token: string;
};

export type DataRecord = {
  id: string;
  data: Record<string, unknown>;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DataListResponse = {
  records: DataRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type Product = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  plans: Plan[];
};

export type Plan = {
  id: string;
  code: string;
  name: string;
  billingPeriodUnit: "day" | "week" | "month" | "year";
  billingPeriodCount: number;
  price: number;
  currency: string;
  entitlements: Array<{ code: string; name: string; value: unknown }>;
};

export type Subscription = {
  id: string;
  status: string;
  provider: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: { code: string; name: string; product: string } | null;
};

export type Entitlement = {
  code: string;
  name: string;
  value: unknown;
};

export type StorageObject = {
  id: string;
  key: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

export type VerifyPurchaseResult = {
  ok: boolean;
  status: string;
  subscriptionId: string;
  planCode: string;
  periodEnd: string | null;
};

export class AtrinaError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AtrinaError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
