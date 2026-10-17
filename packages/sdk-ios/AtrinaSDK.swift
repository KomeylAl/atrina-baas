import Foundation

// ============================================================
// Atrina BaaS — Swift SDK (iOS / macOS)
//
// Quick start:
//
//   let atrina = AtrinaClient(
//       baseUrl: "https://api.atrina.io/api/v1",
//       apiKey: "atr_pk_production_..."
//   )
//
//   // Signup
//   let session = try await atrina.auth.signup(
//       email: "alice@example.com",
//       password: "secret123",
//       displayName: "Alice"
//   )
//
//   // Work with data
//   let posts = atrina.data.table("posts")
//   let list = try await posts.list()
//   let post = try await posts.create(["title": "Hello", "body": "World"])
//
// Requires: iOS 15+ (async/await), Foundation only
// ============================================================

public struct AtrinaConfig {
    public let baseUrl: String
    public let apiKey: String
    public var userToken: String?
    public let timeoutInterval: TimeInterval
    public let retries: Int

    public init(
        baseUrl: String,
        apiKey: String,
        userToken: String? = nil,
        timeoutInterval: TimeInterval = 30,
        retries: Int = 2
    ) {
        self.baseUrl = baseUrl
        self.apiKey = apiKey
        self.userToken = userToken
        self.timeoutInterval = timeoutInterval
        self.retries = retries
    }
}

public struct AtrinaError: Error {
    public let code: String
    public let message: String
    public let status: Int
    public let details: Any?

    public init(code: String, message: String, status: Int, details: Any? = nil) {
        self.code = code
        self.message = message
        self.status = status
        self.details = details
    }
}

public final class AtrinaClient {
    public let config: AtrinaConfig
    public let auth: Auth
    public let data: Data
    public let billing: Billing
    public let storage: Storage

    private let session: URLSession

    public init(config: AtrinaConfig) {
        self.config = config
        self.session = URLSession(configuration: .default)
        self.auth = Auth(client: self)
        self.data = Data(client: self)
        self.billing = Billing(client: self)
        self.storage = Storage(client: self)
    }

    public func setUserToken(_ token: String?) { config.userToken = token }
    public func getUserToken() -> String? { config.userToken }

    internal func request(
        _ method: String,
        path: String,
        body: [String: Any]? = nil,
        queryParams: [String: String] = [:]
    ) async throws -> [String: Any] {
        var urlComponents = URLComponents(string: "\(config.baseUrl)\(path)")!
        if !queryParams.isEmpty {
            urlComponents.queryItems = queryParams.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = urlComponents.url else {
            throw AtrinaError(code: "INVALID_URL", message: "Invalid URL", status: 0)
        }

        var request = URLRequest(url: url, timeoutInterval: config.timeoutInterval)
        request.httpMethod = method
        request.setValue(config.apiKey, forHTTPHeaderField: "x-atrina-key")
        if let token = config.userToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = body, method == "POST" || method == "PATCH" {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        var lastError: AtrinaError?
        for attempt in 0...config.retries {
            do {
                let (data, response) = try await session.data(for: request)
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw AtrinaError(code: "NETWORK_ERROR", message: "Invalid response", status: 0)
                }
                let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]
                if !(200...299).contains(httpResponse.statusCode) {
                    if httpResponse.statusCode >= 500 && attempt < config.retries {
                        try await Task.sleep(nanoseconds: UInt64(500_000_000 * (1 << attempt)))
                        continue
                    }
                    let err = json["error"] as? [String: Any]
                    throw AtrinaError(
                        code: (err?["code"] as? String) ?? "HTTP_ERROR",
                        message: (err?["message"] as? String) ?? "HTTP \(httpResponse.statusCode)",
                        status: httpResponse.statusCode,
                        details: json
                    )
                }
                return (json["data"] as? [String: Any]) ?? json
            } catch let e as AtrinaError {
                if e.status < 500 { throw e }
                lastError = e
            } catch {
                lastError = AtrinaError(code: "NETWORK_ERROR", message: error.localizedDescription, status: 0)
            }
            if attempt < config.retries {
                try await Task.sleep(nanoseconds: UInt64(500_000_000 * (1 << attempt)))
            }
        }
        throw lastError ?? AtrinaError(code: "UNKNOWN", message: "Unknown error", status: 0)
    }
}

// ============================================================
// Auth
// ============================================================

public final class Auth {
    private let client: AtrinaClient
    init(client: AtrinaClient) { self.client = client }

    public struct Session: Codable {
        public let user: [String: Any]
        public let token: String
    }

    public func signup(email: String, password: String, displayName: String? = nil) async throws -> [String: Any] {
        var body: [String: Any] = ["email": email, "password": password]
        if let dn = displayName { body["displayName"] = dn }
        let res = try await client.request("POST", path: "/auth/signup", body: body)
        if let token = res["token"] as? String { client.setUserToken(token) }
        return res
    }

    public func login(email: String, password: String) async throws -> [String: Any] {
        let res = try await client.request("POST", path: "/auth/login", body: ["email": email, "password": password])
        if let token = res["token"] as? String { client.setUserToken(token) }
        return res
    }

    public func logout() async throws {
        _ = try await client.request("POST", path: "/auth/logout")
        client.setUserToken(nil)
    }

    public func me() async throws -> [String: Any] {
        try await client.request("GET", path: "/auth/me")
    }

    public func forgotPassword(_ email: String) async throws {
        _ = try await client.request("POST", path: "/auth/password/forgot", body: ["email": email])
    }

    public func resetPassword(email: String, newPassword: String, resetToken: String) async throws {
        _ = try await client.request("POST", path: "/auth/password/reset", body: [
            "email": email, "newPassword": newPassword, "resetToken": resetToken
        ])
    }
}

// ============================================================
// Data
// ============================================================

public final class Data {
    private let client: AtrinaClient
    init(client: AtrinaClient) { self.client = client }

    public func table(_ name: String) -> Table { Table(client: client, name: name) }

    public final class Table {
        private let client: AtrinaClient
        private let name: String
        init(client: AtrinaClient, name: String) { self.client = client; self.name = name }

        public func list(page: Int = 1, pageSize: Int = 20) async throws -> [String: Any] {
            try await client.request("GET", path: "/data/\(name)", queryParams: ["page": "\(page)", "pageSize": "\(pageSize)"])
        }

        public func get(_ recordId: String) async throws -> [String: Any] {
            try await client.request("GET", path: "/data/\(name)/\(recordId)")
        }

        public func create(_ data: [String: Any]) async throws -> [String: Any] {
            try await client.request("POST", path: "/data/\(name)", body: data)
        }

        public func update(_ recordId: String, _ data: [String: Any]) async throws -> [String: Any] {
            try await client.request("PATCH", path: "/data/\(name)/\(recordId)", body: data)
        }

        public func delete(_ recordId: String) async throws {
            _ = try await client.request("DELETE", path: "/data/\(name)/\(recordId)")
        }
    }
}

// ============================================================
// Billing
// ============================================================

public final class Billing {
    private let client: AtrinaClient
    init(client: AtrinaClient) { self.client = client }

    public func products() async throws -> [String: Any] {
        try await client.request("GET", path: "/billing/products")
    }

    public func verifyPurchase(planId: String, purchaseToken: String, storeProductId: String, provider: String) async throws -> [String: Any] {
        try await client.request("POST", path: "/billing/purchases/verify", body: [
            "planId": planId, "purchaseToken": purchaseToken,
            "storeProductId": storeProductId, "provider": provider
        ])
    }

    public func subscriptions() async throws -> [String: Any] {
        try await client.request("GET", path: "/billing/subscriptions")
    }
}

// ============================================================
// Storage
// ============================================================

public final class Storage {
    private let client: AtrinaClient
    init(client: AtrinaClient) { self.client = client }

    public func upload(_ data: Data, fileName: String, contentType: String = "application/octet-stream") async throws -> [String: Any] {
        let url = URL(string: "\(client.config.baseUrl)/storage/upload")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(client.config.apiKey, forHTTPHeaderField: "x-atrina-key")
        if let token = client.config.userToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(contentType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (responseData, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw AtrinaError(code: "UPLOAD_FAILED", message: "Upload failed", status: 0)
        }
        let json = (try? JSONSerialization.jsonObject(with: responseData)) as? [String: Any] ?? [:]
        return (json["data"] as? [String: Any]) ?? json
    }
}
