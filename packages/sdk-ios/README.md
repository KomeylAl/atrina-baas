# Atrina BaaS iOS SDK

Minimal Swift client for the public data-plane API. Uses only a **publishable** API key plus optional user Bearer token. Do not ship server/admin secrets in the app.

## Setup

Add the `Sources/AtrinaBaas` folder as a local Swift package or copy files into your Xcode target.

## Example

```swift
let client = AtrinaClient(
    apiKey: ProcessInfo.processInfo.environment["ATRIINA_PUBLISHABLE_KEY"] ?? "",
    baseUrl: "https://api.example.com/api/v1"
)

try await client.auth.login(email: "user@example.com", password: "Password123!")
let notes = try await client.data.list(table: "notes")
```
