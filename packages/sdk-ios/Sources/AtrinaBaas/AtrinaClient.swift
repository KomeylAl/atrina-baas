import Foundation

/// Thin iOS/macOS client for Atrina BaaS public APIs.
/// Use publishable keys only — never server/admin secrets.
public final class AtrinaClient: @unchecked Sendable {
    public let apiKey: String
    public let baseUrl: String
    public var accessToken: String?

    public init(apiKey: String, baseUrl: String = "http://localhost:8000/api/v1") {
        self.apiKey = apiKey
        self.baseUrl = baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    public var auth: AuthAPI { AuthAPI(client: self) }
    public var data: DataAPI { DataAPI(client: self) }
    public var billing: BillingAPI { BillingAPI(client: self) }

    func request(
        method: String,
        path: String,
        body: [String: Any]? = nil,
        requiresUser: Bool = false
    ) async throws -> [String: Any] {
        guard let url = URL(string: baseUrl + path) else {
            throw AtrinaError(status: 0, message: "Invalid URL")
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(apiKey, forHTTPHeaderField: "X-Atrina-Key")

        if requiresUser {
            guard let accessToken else {
                throw AtrinaError(status: 401, message: "Not authenticated")
            }
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]

        guard (200..<300).contains(status) else {
            let message = object["message"] as? String ?? "Request failed (\(status))"
            throw AtrinaError(status: status, message: message)
        }

        return object
    }
}

public struct AtrinaError: Error, LocalizedError {
    public let status: Int
    public let message: String
    public var errorDescription: String? { message }

    public init(status: Int, message: String) {
        self.status = status
        self.message = message
    }
}

public struct AuthAPI {
    let client: AtrinaClient

    public func login(email: String, password: String) async throws -> [String: Any] {
        let json = try await client.request(
            method: "POST",
            path: "/project-auth/login",
            body: ["email": email, "password": password]
        )
        client.accessToken = json["token"] as? String
        return json
    }

    public func signup(email: String, password: String, displayName: String? = nil) async throws -> [String: Any] {
        var body: [String: Any] = [
            "email": email,
            "password": password,
            "password_confirmation": password,
        ]
        if let displayName { body["display_name"] = displayName }
        let json = try await client.request(method: "POST", path: "/project-auth/signup", body: body)
        client.accessToken = json["token"] as? String
        return json
    }

    public func me() async throws -> [String: Any] {
        try await client.request(method: "GET", path: "/project-auth/me", requiresUser: true)
    }
}

public struct DataAPI {
    let client: AtrinaClient

    public func list(table: String) async throws -> [String: Any] {
        try await client.request(
            method: "GET",
            path: "/data/\(table)",
            requiresUser: client.accessToken != nil
        )
    }

    public func create(table: String, attributes: [String: Any]) async throws -> [String: Any] {
        try await client.request(
            method: "POST",
            path: "/data/\(table)",
            body: ["data": attributes],
            requiresUser: client.accessToken != nil
        )
    }
}

public struct BillingAPI {
    let client: AtrinaClient

    public func entitlements() async throws -> [String: Any] {
        try await client.request(method: "GET", path: "/billing/entitlements", requiresUser: true)
    }

    public func verifyPurchase(provider: String, storeProductId: String, purchaseToken: String) async throws -> [String: Any] {
        try await client.request(
            method: "POST",
            path: "/billing/purchases/verify",
            body: [
                "provider": provider,
                "store_product_id": storeProductId,
                "purchase_token": purchaseToken,
            ],
            requiresUser: true
        )
    }
}
