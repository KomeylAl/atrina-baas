-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastSignInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'developer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'development',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_credentials" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scopes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "projectId" TEXT,
    "environmentId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "source" TEXT NOT NULL DEFAULT 'api',
    "idempotencyKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_users" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSignInAt" TIMESTAMP(3),

    CONSTRAINT "project_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_tables" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "schemaDefinition" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_policies" (
    "id" TEXT NOT NULL,
    "dataTableId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "policyDefinition" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_records" (
    "id" TEXT NOT NULL,
    "dataTableId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_providers" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "configurationEnc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingPeriodUnit" TEXT NOT NULL,
    "billingPeriodCount" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IRR',
    "status" TEXT NOT NULL DEFAULT 'active',
    "features" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_products" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "provider_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "projectUserId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTransactionId" TEXT,
    "providerPurchaseToken" TEXT,
    "providerProductId" TEXT,
    "planId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" INTEGER,
    "currency" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "rawPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "projectUserId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "providerSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "valueType" TEXT NOT NULL DEFAULT 'boolean',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_entitlements" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "plan_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "payloadRedacted" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_objects" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "ownerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "storage_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "templateCode" TEXT,
    "recipient" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT NOT NULL,
    "signingSecret" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "responseCode" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotas" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "limitValue" INTEGER NOT NULL,
    "period" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_tokenHash_key" ON "user_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "user_sessions_userId_idx" ON "user_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organizationId_slug_key" ON "projects"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "environments_projectId_idx" ON "environments"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "environments_projectId_slug_key" ON "environments"("projectId", "slug");

-- CreateIndex
CREATE INDEX "api_credentials_environmentId_idx" ON "api_credentials"("environmentId");

-- CreateIndex
CREATE INDEX "api_credentials_status_idx" ON "api_credentials"("status");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_projectId_idx" ON "audit_logs"("projectId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "usage_events_projectId_environmentId_occurredAt_idx" ON "usage_events"("projectId", "environmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "usage_events_projectId_environmentId_metric_idempotencyKey_key" ON "usage_events"("projectId", "environmentId", "metric", "idempotencyKey");

-- CreateIndex
CREATE INDEX "project_users_projectId_environmentId_idx" ON "project_users"("projectId", "environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "project_users_projectId_environmentId_email_key" ON "project_users"("projectId", "environmentId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "project_sessions_tokenHash_key" ON "project_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "project_sessions_userId_idx" ON "project_sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "data_tables_environmentId_name_key" ON "data_tables"("environmentId", "name");

-- CreateIndex
CREATE INDEX "data_records_dataTableId_idx" ON "data_records"("dataTableId");

-- CreateIndex
CREATE INDEX "data_records_environmentId_idx" ON "data_records"("environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "products_projectId_code_key" ON "products"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "plans_productId_code_key" ON "plans"("productId", "code");

-- CreateIndex
CREATE INDEX "purchases_projectId_environmentId_idx" ON "purchases"("projectId", "environmentId");

-- CreateIndex
CREATE INDEX "purchases_projectUserId_idx" ON "purchases"("projectUserId");

-- CreateIndex
CREATE INDEX "subscriptions_projectId_environmentId_idx" ON "subscriptions"("projectId", "environmentId");

-- CreateIndex
CREATE INDEX "subscriptions_projectUserId_idx" ON "subscriptions"("projectUserId");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_projectId_code_key" ON "entitlements"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "plan_entitlements_planId_entitlementId_key" ON "plan_entitlements"("planId", "entitlementId");

-- CreateIndex
CREATE INDEX "subscription_events_subscriptionId_idx" ON "subscription_events"("subscriptionId");

-- CreateIndex
CREATE INDEX "storage_objects_projectId_environmentId_idx" ON "storage_objects"("projectId", "environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_projectId_environmentId_channel_code_key" ON "notification_templates"("projectId", "environmentId", "channel", "code");

-- CreateIndex
CREATE INDEX "notification_logs_projectId_environmentId_idx" ON "notification_logs"("projectId", "environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "quotas_projectId_environmentId_metric_key" ON "quotas"("projectId", "environmentId", "metric");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_credentials" ADD CONSTRAINT "api_credentials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "platform_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_sessions" ADD CONSTRAINT "project_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "project_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_tables" ADD CONSTRAINT "data_tables_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_policies" ADD CONSTRAINT "data_policies_dataTableId_fkey" FOREIGN KEY ("dataTableId") REFERENCES "data_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_records" ADD CONSTRAINT "data_records_dataTableId_fkey" FOREIGN KEY ("dataTableId") REFERENCES "data_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_providers" ADD CONSTRAINT "billing_providers_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_products" ADD CONSTRAINT "provider_products_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_projectUserId_fkey" FOREIGN KEY ("projectUserId") REFERENCES "project_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_projectUserId_fkey" FOREIGN KEY ("projectUserId") REFERENCES "project_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_entitlements" ADD CONSTRAINT "plan_entitlements_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "entitlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
