# Atrina BaaS Android SDK

Minimal Kotlin HTTP client for the public data-plane API. Uses only a **publishable** API key plus optional user Bearer token. Do not ship server/admin secrets in the app.

## Setup

Copy `src/main/java/ir/atrina/baas/` into your Android app module, or include this folder as a library module.

Requires `OkHttp` 4.x:

```gradle
implementation("com.squareup.okhttp3:okhttp:4.12.0")
```

## Example

```kotlin
val client = AtrinaClient(
    apiKey = BuildConfig.ATRIINA_PUBLISHABLE_KEY,
    baseUrl = "https://api.example.com/api/v1",
)

client.auth.login("user@example.com", "Password123!")
val notes = client.data.list("notes")
```
