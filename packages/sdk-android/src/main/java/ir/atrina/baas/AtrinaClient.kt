package ir.atrina.baas

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

/**
 * Thin Android client for Atrina BaaS public APIs.
 * Use publishable keys only — never server/admin secrets.
 */
class AtrinaClient(
    private val apiKey: String,
    private val baseUrl: String = "http://10.0.2.2:8000/api/v1",
    private val http: OkHttpClient = OkHttpClient(),
) {
    var accessToken: String? = null

    val auth = AuthApi()
    val data = DataApi()
    val billing = BillingApi()

    inner class AuthApi {
        fun signup(email: String, password: String, displayName: String? = null): JSONObject {
            val body = JSONObject()
                .put("email", email)
                .put("password", password)
                .put("password_confirmation", password)
            if (displayName != null) body.put("display_name", displayName)
            val json = request("POST", "/project-auth/signup", body)
            accessToken = json.getString("token")
            return json
        }

        fun login(email: String, password: String): JSONObject {
            val body = JSONObject().put("email", email).put("password", password)
            val json = request("POST", "/project-auth/login", body)
            accessToken = json.getString("token")
            return json
        }

        fun me(): JSONObject = request("GET", "/project-auth/me", auth = true)
    }

    inner class DataApi {
        fun list(table: String): JSONObject =
            request("GET", "/data/${table}", auth = accessToken != null)

        fun create(table: String, attributes: JSONObject): JSONObject =
            request(
                "POST",
                "/data/${table}",
                JSONObject().put("data", attributes),
                auth = accessToken != null,
            )
    }

    inner class BillingApi {
        fun entitlements(): JSONObject =
            request("GET", "/billing/entitlements", auth = true)

        fun verifyPurchase(provider: String, storeProductId: String, purchaseToken: String): JSONObject =
            request(
                "POST",
                "/billing/purchases/verify",
                JSONObject()
                    .put("provider", provider)
                    .put("store_product_id", storeProductId)
                    .put("purchase_token", purchaseToken),
                auth = true,
            )
    }

    private fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
        auth: Boolean = false,
    ): JSONObject {
        val builder = Request.Builder()
            .url(baseUrl.trimEnd('/') + path)
            .header("Accept", "application/json")
            .header("X-Atrina-Key", apiKey)

        if (auth) {
            val token = accessToken ?: throw AtrinaException(401, "Not authenticated")
            builder.header("Authorization", "Bearer $token")
        }

        if (body != null) {
            builder.method(
                method,
                body.toString().toRequestBody("application/json".toMediaType()),
            )
        } else {
            builder.method(method, null)
        }

        http.newCall(builder.build()).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw AtrinaException(response.code, text.ifBlank { "Request failed" })
            }
            return if (text.isBlank()) JSONObject() else JSONObject(text)
        }
    }
}

class AtrinaException(val status: Int, message: String) : Exception(message)
