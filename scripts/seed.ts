/**
 * Atrina BaaS — comprehensive seed script
 * Run with: `bun run scripts/seed.ts`
 *
 * Seeds Phase 0-6: users, projects, environments, credentials,
 * project users, data tables + records, products + plans, purchases + subscriptions,
 * storage objects, notification templates + logs, webhook endpoints + deliveries, quotas.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword, generateApiSecret, hashSecret } from "../src/lib/security/crypto";
import { computePeriodEnd } from "../src/lib/billing";

const db = new PrismaClient();

async function main() {
  console.log("→ Cleaning existing data...");
  await db.userSession.deleteMany();
  await db.projectSession.deleteMany();
  await db.apiCredential.deleteMany();
  await db.auditLog.deleteMany();
  await db.usageEvent.deleteMany();
  await db.webhookDelivery.deleteMany();
  await db.webhookEndpoint.deleteMany();
  await db.notificationLog.deleteMany();
  await db.notificationTemplate.deleteMany();
  await db.storageObject.deleteMany();
  await db.subscriptionEvent.deleteMany();
  await db.subscription.deleteMany();
  await db.purchase.deleteMany();
  await db.planEntitlement.deleteMany();
  await db.providerProduct.deleteMany();
  await db.plan.deleteMany();
  await db.entitlement.deleteMany();
  await db.product.deleteMany();
  await db.billingProvider.deleteMany();
  await db.dataRecord.deleteMany();
  await db.dataPolicy.deleteMany();
  await db.dataTable.deleteMany();
  await db.projectUser.deleteMany();
  await db.environment.deleteMany();
  await db.project.deleteMany();
  await db.organizationMember.deleteMany();
  await db.organization.deleteMany();
  await db.platformUser.deleteMany();
  await db.quota.deleteMany();

  console.log("→ Creating demo user...");
  const user = await db.platformUser.create({
    data: {
      email: "demo@atrina.io",
      passwordHash: hashPassword("atrina123"),
      displayName: "مدیر دمو",
      status: "active",
      emailVerifiedAt: new Date(),
      lastSignInAt: new Date(),
    },
  });

  console.log("→ Creating organization Atrina...");
  const org = await db.organization.create({ data: { name: "Atrina", slug: "atrina", status: "active" } });
  await db.organizationMember.create({ data: { organizationId: org.id, userId: user.id, role: "owner", status: "active" } });

  // --- Project 1: mobile-app
  console.log("→ Creating project 'mobile-app'...");
  const proj1 = await db.project.create({
    data: {
      organizationId: org.id,
      name: "اپ موبایل آترینا",
      slug: "mobile-app",
      description: "اپ اصلی اندروید و iOS",
      status: "active",
      createdById: user.id,
    },
  });

  const env1Dev = await db.environment.create({
    data: { projectId: proj1.id, name: "Development", slug: "development", type: "development", status: "active" },
  });
  const env1Prod = await db.environment.create({
    data: { projectId: proj1.id, name: "Production", slug: "production", type: "production", status: "active" },
  });
  const env1Stage = await db.environment.create({
    data: { projectId: proj1.id, name: "Staging", slug: "staging", type: "staging", status: "active" },
  });

  // Credentials for proj1
  await seedCredential(env1Dev.id, user.id, "کلید عمومی دمو", "publishable", ["read"]);
  await seedCredential(env1Dev.id, user.id, "کلید سرور دمو", "server_secret", ["read", "write"]);
  await seedCredential(env1Prod.id, user.id, "کلید سرور تولید", "server_secret", ["read", "write"]);
  await seedCredential(env1Prod.id, user.id, "کلید عمومی تولید", "publishable", ["read"]);

  // --- Project 2: admin-panel
  console.log("→ Creating project 'admin-panel'...");
  const proj2 = await db.project.create({
    data: {
      organizationId: org.id,
      name: "پنل ادمین وب",
      slug: "admin-panel",
      description: "پنل مدیریت داخلی",
      status: "active",
      createdById: user.id,
    },
  });
  const env2Dev = await db.environment.create({
    data: { projectId: proj2.id, name: "Development", slug: "development", type: "development", status: "active" },
  });
  const env2Prod = await db.environment.create({
    data: { projectId: proj2.id, name: "Production", slug: "production", type: "production", status: "active" },
  });
  await seedCredential(env2Dev.id, user.id, "کلید عمومی پنل", "publishable", ["read"]);
  await seedCredential(env2Prod.id, user.id, "کلید سرور پنل", "server_secret", ["read", "write"]);

  // --- Phase 2: Project users
  console.log("→ Seeding project users...");
  const pu1 = await db.projectUser.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      email: "alice@example.com", passwordHash: hashPassword("alice123"),
      displayName: "آلیس", status: "active", emailVerifiedAt: new Date(),
      lastSignInAt: new Date(Date.now() - 3600000),
    },
  });
  const pu2 = await db.projectUser.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      email: "bob@example.com", passwordHash: hashPassword("bob123456"),
      displayName: "باب", status: "active", emailVerifiedAt: new Date(),
      lastSignInAt: new Date(Date.now() - 86400000 * 2),
    },
  });
  const pu3 = await db.projectUser.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      email: "blocked@example.com", passwordHash: hashPassword("user1234"),
      displayName: "کاربر مسدود", status: "blocked", emailVerifiedAt: new Date(),
    },
  });
  await db.projectUser.create({
    data: {
      projectId: proj1.id, environmentId: env1Dev.id,
      email: "tester@example.com", passwordHash: hashPassword("tester12"),
      displayName: "تستر", status: "active", emailVerifiedAt: new Date(),
      lastSignInAt: new Date(Date.now() - 7200000),
    },
  });

  // --- Phase 3: Data tables
  console.log("→ Seeding data tables...");
  const postsTable = await db.dataTable.create({
    data: {
      environmentId: env1Prod.id,
      name: "posts",
      displayName: "پست‌ها",
      schemaDefinition: JSON.stringify({
        columns: [
          { name: "title", type: "string", required: true },
          { name: "body", type: "string", required: true },
          { name: "views", type: "integer", default: 0 },
          { name: "published", type: "boolean", default: false },
        ],
      }),
      status: "active",
    },
  });
  // Default policies: authenticated can read+write, owner can update+delete, service can read
  await db.dataPolicy.createMany({
    data: [
      { dataTableId: postsTable.id, operation: "select", subject: "authenticated", policyDefinition: "{}", enabled: true },
      { dataTableId: postsTable.id, operation: "insert", subject: "authenticated", policyDefinition: "{}", enabled: true },
      { dataTableId: postsTable.id, operation: "update", subject: "owner", policyDefinition: "{}", enabled: true },
      { dataTableId: postsTable.id, operation: "delete", subject: "owner", policyDefinition: "{}", enabled: true },
      { dataTableId: postsTable.id, operation: "select", subject: "service", policyDefinition: "{}", enabled: true },
    ],
  });
  // Sample records
  for (let i = 1; i <= 5; i++) {
    await db.dataRecord.create({
      data: {
        dataTableId: postsTable.id, environmentId: env1Prod.id,
        data: JSON.stringify({ title: `پست ${i}`, body: `این محتوای پست ${i} است.`, views: Math.floor(Math.random() * 1000), published: true }),
        ownerUserId: i % 2 === 0 ? pu1.id : pu2.id,
      },
    });
  }
  // profiles table in dev env
  const profilesTable = await db.dataTable.create({
    data: {
      environmentId: env1Dev.id,
      name: "profiles",
      schemaDefinition: JSON.stringify({
        columns: [
          { name: "name", type: "string", required: true },
          { name: "age", type: "integer" },
          { name: "bio", type: "string" },
        ],
      }),
      status: "active",
    },
  });
  await db.dataPolicy.createMany({
    data: [
      { dataTableId: profilesTable.id, operation: "select", subject: "authenticated", policyDefinition: "{}", enabled: true },
      { dataTableId: profilesTable.id, operation: "insert", subject: "authenticated", policyDefinition: "{}", enabled: true },
      { dataTableId: profilesTable.id, operation: "update", subject: "owner", policyDefinition: "{}", enabled: true },
      { dataTableId: profilesTable.id, operation: "delete", subject: "owner", policyDefinition: "{}", enabled: true },
    ],
  });

  // --- Phase 4: Billing
  console.log("→ Seeding billing: providers, products, plans...");
  await db.billingProvider.create({
    data: {
      environmentId: env1Prod.id,
      provider: "cafebazaar",
      displayName: "CafeBazaar اصلی",
      status: "active",
      configurationEnc: Buffer.from(JSON.stringify({ mock: true })).toString("base64"),
    },
  });
  await db.billingProvider.create({
    data: {
      environmentId: env1Prod.id,
      provider: "myket",
      displayName: "Myket پشتیبان",
      status: "active",
      configurationEnc: Buffer.from(JSON.stringify({ mock: true })).toString("base64"),
    },
  });

  const product = await db.product.create({
    data: {
      projectId: proj1.id,
      code: "pro",
      name: "اشتراک پرو",
      description: "دسترسی کامل به امکانات اپ",
      status: "active",
    },
  });
  // Entitlements
  const ent1 = await db.entitlement.create({ data: { projectId: proj1.id, code: "pro", name: "Pro", description: "دسترسی کامل", valueType: "boolean" } });
  const ent2 = await db.entitlement.create({ data: { projectId: proj1.id, code: "ads_free", name: "بدون تبلیغات", valueType: "boolean" } });
  const ent3 = await db.entitlement.create({ data: { projectId: proj1.id, code: "max_items", name: "حداکثر آیتم", valueType: "integer" } });

  const planMonthly = await db.plan.create({
    data: {
      productId: product.id,
      code: "monthly",
      name: "ماهانه",
      billingPeriodUnit: "month",
      billingPeriodCount: 1,
      price: 50000,
      currency: "IRR",
      features: JSON.stringify({ priority: "high" }),
      status: "active",
    },
  });
  const planYearly = await db.plan.create({
    data: {
      productId: product.id,
      code: "yearly",
      name: "سالانه",
      billingPeriodUnit: "year",
      billingPeriodCount: 1,
      price: 480000,
      currency: "IRR",
      features: JSON.stringify({ priority: "highest", discount: "20%" }),
      status: "active",
    },
  });
  await db.planEntitlement.create({ data: { planId: planMonthly.id, entitlementId: ent1.id, value: JSON.stringify(true) } });
  await db.planEntitlement.create({ data: { planId: planMonthly.id, entitlementId: ent2.id, value: JSON.stringify(true) } });
  await db.planEntitlement.create({ data: { planId: planMonthly.id, entitlementId: ent3.id, value: JSON.stringify(100) } });
  await db.planEntitlement.create({ data: { planId: planYearly.id, entitlementId: ent1.id, value: JSON.stringify(true) } });
  await db.planEntitlement.create({ data: { planId: planYearly.id, entitlementId: ent2.id, value: JSON.stringify(true) } });
  await db.planEntitlement.create({ data: { planId: planYearly.id, entitlementId: ent3.id, value: JSON.stringify(1000) } });

  // Provider product mappings
  await db.providerProduct.create({ data: { planId: planMonthly.id, provider: "cafebazaar", storeProductId: "pro_monthly_v1", environmentId: env1Prod.id, status: "active" } });
  await db.providerProduct.create({ data: { planId: planYearly.id, provider: "cafebazaar", storeProductId: "pro_yearly_v1", environmentId: env1Prod.id, status: "active" } });
  await db.providerProduct.create({ data: { planId: planMonthly.id, provider: "myket", storeProductId: "atr_pro_monthly", environmentId: env1Prod.id, status: "active" } });

  // Subscriptions + purchases for project users
  const periodStart = new Date();
  const periodEnd = computePeriodEnd(periodStart, "month", 1);
  const sub1 = await db.subscription.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id, projectUserId: pu1.id,
      planId: planMonthly.id, provider: "cafebazaar",
      status: "active", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false, providerSubscriptionId: "demo_s_sub001",
    },
  });
  await db.purchase.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id, projectUserId: pu1.id,
      provider: "cafebazaar", providerTransactionId: "cb_tx_001",
      providerPurchaseToken: "demo_s_sub001", providerProductId: "pro_monthly_v1",
      planId: planMonthly.id, status: "verified", amount: 50000, currency: "IRR",
      purchasedAt: periodStart, verifiedAt: periodStart,
      rawPayload: JSON.stringify({ store: "cafebazaar", simulated: true }),
    },
  });
  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub1.id, eventType: "purchase.verified",
      source: "cafebazaar", idempotencyKey: "cb_tx_001",
      payloadRedacted: JSON.stringify({ planId: planMonthly.id }),
      processedAt: periodStart,
    },
  });

  const sub2 = await db.subscription.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id, projectUserId: pu2.id,
      planId: planYearly.id, provider: "myket",
      status: "active", currentPeriodStart: periodStart, currentPeriodEnd: computePeriodEnd(periodStart, "year", 1),
      cancelAtPeriodEnd: false, providerSubscriptionId: "demo_s_sub002",
    },
  });
  await db.purchase.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id, projectUserId: pu2.id,
      provider: "myket", providerTransactionId: "mk_tx_001",
      providerPurchaseToken: "demo_s_sub002", providerProductId: "atr_pro_yearly",
      planId: planYearly.id, status: "verified", amount: 480000, currency: "IRR",
      purchasedAt: periodStart, verifiedAt: periodStart,
      rawPayload: JSON.stringify({ store: "myket", simulated: true }),
    },
  });
  await db.subscriptionEvent.create({
    data: {
      subscriptionId: sub2.id, eventType: "purchase.verified",
      source: "myket", idempotencyKey: "mk_tx_001",
      payloadRedacted: JSON.stringify({ planId: planYearly.id }),
      processedAt: periodStart,
    },
  });

  // A rejected purchase attempt
  await db.purchase.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id, projectUserId: pu3.id,
      provider: "cafebazaar", providerPurchaseToken: "demo_invalid",
      planId: planMonthly.id, status: "rejected",
    },
  });

  // --- Phase 5a: Storage objects
  console.log("→ Seeding storage objects...");
  await db.storageObject.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      key: `${proj1.id}/${env1Prod.id}/seed1/profile.jpg`,
      fileName: "profile.jpg", contentType: "image/jpeg", size: 245000,
      ownerUserId: pu1.id, status: "active",
      metadata: JSON.stringify({ uploadedVia: "seed" }),
    },
  });
  await db.storageObject.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      key: `${proj1.id}/${env1Prod.id}/seed2/cv.pdf`,
      fileName: "cv.pdf", contentType: "application/pdf", size: 48000,
      ownerUserId: pu2.id, status: "active",
    },
  });
  await db.storageObject.create({
    data: {
      projectId: proj2.id, environmentId: env2Prod.id,
      key: `${proj2.id}/${env2Prod.id}/seed1/logo.png`,
      fileName: "logo.png", contentType: "image/png", size: 12000,
      status: "active",
    },
  });

  // --- Phase 5b: Notification templates + logs
  console.log("→ Seeding notification templates + logs...");
  const welcomeSms = await db.notificationTemplate.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      channel: "sms", code: "welcome", name: "پیام خوش‌آمد",
      body: "سلام {{name}} عزیز، به اپ خوش آمدید!",
      status: "active",
    },
  });
  const monthlyEmail = await db.notificationTemplate.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      channel: "email", code: "monthly_receipt", name: "رسید ماهانه",
      subject: "رسید پرداخت اشتراک شما",
      body: "اشتراک شما با موفقیت تمدید شد. مبلغ: {{amount}}",
      status: "active",
    },
  });
  const pushTemplate = await db.notificationTemplate.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      channel: "push", code: "new_message", name: "پیام جدید",
      body: "شما یک پیام جدید دارید",
      status: "active",
    },
  });

  // Logs
  await db.notificationLog.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      channel: "sms", provider: "kavenegar-mock", templateCode: "welcome",
      recipient: "+989121234567", status: "sent", attempts: 1,
      providerMessageId: "sms_seed_001",
      sentAt: new Date(Date.now() - 86400000 * 2),
    },
  });
  await db.notificationLog.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      channel: "email", provider: "mailgun-mock", templateCode: "monthly_receipt",
      recipient: "alice@example.com", status: "sent", attempts: 1,
      providerMessageId: "mail_seed_001",
      sentAt: new Date(Date.now() - 86400000),
    },
  });
  await db.notificationLog.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      channel: "sms", provider: "kavenegar-mock",
      recipient: "+989120000000", status: "failed", attempts: 3,
      errorMessage: "Recipient opted out",
    },
  });

  // --- Phase 5c: Webhooks
  console.log("→ Seeding webhook endpoints + deliveries...");
  const webhook = await db.webhookEndpoint.create({
    data: {
      projectId: proj1.id, environmentId: env1Prod.id,
      url: "https://example.com/webhooks/atrina",
      events: JSON.stringify(["user.signup", "subscription.verified", "subscription.canceled"]),
      signingSecret: "demo_signing_secret_seed",
      status: "active",
    },
  });
  await db.webhookDelivery.create({
    data: {
      endpointId: webhook.id, eventType: "user.signup",
      payload: JSON.stringify({ userId: "seed-user-1", email: "alice@example.com" }),
      status: "delivered", attempts: 1, responseCode: 200,
      deliveredAt: new Date(Date.now() - 3600000),
    },
  });
  await db.webhookDelivery.create({
    data: {
      endpointId: webhook.id, eventType: "subscription.verified",
      payload: JSON.stringify({ subscriptionId: "seed-sub-1", planCode: "monthly" }),
      status: "delivered", attempts: 1, responseCode: 200,
      deliveredAt: new Date(Date.now() - 7200000),
    },
  });
  await db.webhookDelivery.create({
    data: {
      endpointId: webhook.id, eventType: "subscription.verified",
      payload: JSON.stringify({ subscriptionId: "seed-sub-2", planCode: "yearly" }),
      status: "failed", attempts: 3, errorMessage: "Timeout",
    },
  });

  // --- Phase 6: Quotas
  console.log("→ Seeding quotas...");
  await db.quota.create({
    data: { projectId: proj1.id, environmentId: env1Prod.id, metric: "api_requests", limitValue: 200000, period: "monthly" },
  });
  await db.quota.create({
    data: { projectId: proj1.id, environmentId: env1Prod.id, metric: "storage_bytes", limitValue: 1024 * 1024 * 1024, period: "monthly" },
  });
  await db.quota.create({
    data: { projectId: proj1.id, environmentId: env1Prod.id, metric: "monthly_users", limitValue: 50000, period: "monthly" },
  });
  await db.quota.create({
    data: { projectId: proj1.id, environmentId: env1Dev.id, metric: "api_requests", limitValue: 100000, period: "monthly" },
  });

  // --- Audit logs
  console.log("→ Creating audit logs...");
  await db.auditLog.createMany({
    data: [
      { actorType: "platform_user", actorId: user.id, action: "platform_user.signup", resourceType: "platform_user", resourceId: user.id, organizationId: org.id, createdAt: new Date(Date.now() - 86400000 * 30) },
      { actorType: "platform_user", actorId: user.id, action: "platform_user.login", resourceType: "platform_user", resourceId: user.id, createdAt: new Date(Date.now() - 86400000 * 7) },
      { actorType: "platform_user", actorId: user.id, action: "organization.create", resourceType: "organization", resourceId: org.id, organizationId: org.id, createdAt: new Date(Date.now() - 86400000 * 29) },
      { actorType: "platform_user", actorId: user.id, action: "project.create", resourceType: "project", resourceId: proj1.id, organizationId: org.id, projectId: proj1.id, createdAt: new Date(Date.now() - 86400000 * 28) },
      { actorType: "platform_user", actorId: user.id, action: "project.create", resourceType: "project", resourceId: proj2.id, organizationId: org.id, projectId: proj2.id, createdAt: new Date(Date.now() - 86400000 * 14) },
      { actorType: "platform_user", actorId: user.id, action: "credential.create", resourceType: "api_credential", resourceId: "seed-cred", organizationId: org.id, projectId: proj1.id, environmentId: env1Prod.id, createdAt: new Date(Date.now() - 86400000 * 27) },
      { actorType: "api_credential", actorId: null, action: "project_user.signup", resourceType: "project_user", resourceId: pu1.id, organizationId: org.id, projectId: proj1.id, environmentId: env1Prod.id, createdAt: new Date(Date.now() - 86400000 * 3) },
      { actorType: "api_credential", actorId: null, action: "purchase.verified", resourceType: "purchase", resourceId: "seed-purchase", organizationId: org.id, projectId: proj1.id, environmentId: env1Prod.id, createdAt: new Date(Date.now() - 86400000 * 2) },
    ],
  });

  // --- Usage events
  console.log("→ Creating usage events (30 days)...");
  const metrics = ["auth.signin", "data.read", "data.write", "storage.upload", "billing.verify"];
  for (let d = 0; d < 30; d++) {
    for (const m of metrics) {
      await db.usageEvent.create({
        data: {
          projectId: proj1.id, environmentId: env1Prod.id,
          metric: m, quantity: Math.floor(Math.random() * 5000) + 200,
          unit: "count", source: "api",
          occurredAt: new Date(Date.now() - d * 24 * 3600 * 1000),
        },
      });
      await db.usageEvent.create({
        data: {
          projectId: proj2.id, environmentId: env2Prod.id,
          metric: m, quantity: Math.floor(Math.random() * 800) + 50,
          unit: "count", source: "api",
          occurredAt: new Date(Date.now() - d * 24 * 3600 * 1000),
        },
      });
    }
  }

  console.log("✓ Seed complete");
  console.log("  → Demo login: demo@atrina.io / atrina123");
  console.log("  → Project users (test data):");
  console.log("    alice@example.com / alice123");
  console.log("    bob@example.com / bob123456");
  console.log("  → Demo purchase tokens (for /api/v1/billing/purchases/verify):");
  console.log("    demo_v_<any> — verified one-time purchase");
  console.log("    demo_s_<any> — verified subscription");
  console.log("    demo_invalid — rejected");
}

async function seedCredential(envId: string, userId: string, name: string, kind: "publishable" | "server_secret" | "admin", scopes: string[]) {
  const prefix = kind === "publishable" ? "atr_pk" : kind === "server_secret" ? "atr_sk" : "atr_adm";
  const { fullSecret, keyPrefix } = generateApiSecret(prefix, "demo");
  await db.apiCredential.create({
    data: {
      environmentId: envId,
      name,
      keyPrefix,
      secretHash: hashSecret(fullSecret),
      kind,
      scopes: JSON.stringify(scopes),
      status: "active",
      createdById: userId,
      lastUsedAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
    },
  });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
