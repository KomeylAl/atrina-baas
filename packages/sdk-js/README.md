# @atrina/baas-js

Official TypeScript client for Atrina BaaS **public data-plane APIs**.

## Rules

- Use a **publishable** API key only (`X-Atrina-Key`).
- Never embed `server_secret` or `admin` credentials in apps or this package.
- User tokens are Bearer tokens from `project-auth/*`.

## Install (workspace)

```bash
cd packages/sdk-js
npm install
npm run build
```

## Usage

```ts
import { createClient } from "@atrina/baas-js";

const client = createClient({
  apiKey: process.env.ATRIINA_PUBLISHABLE_KEY!,
  baseUrl: "https://api.example.com/api/v1",
});

await client.auth.login({ email: "a@b.c", password: "…" });
const rows = await client.data.list("notes");
const entitlements = await client.billing.entitlements();
```

## Surfaces

| Namespace | Endpoints |
|-----------|-----------|
| `auth` | signup, login, OTP, Google, me, logout |
| `data` | CRUD `/data/{table}` |
| `billing` | products, plans, verify, entitlements, subscriptions |
