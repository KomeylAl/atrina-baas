package io.atrina.baas.sdk

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

/**
 * Atrina BaaS — Kotlin SDK (Android / JVM)
 *
 * Quick start:
 *
 * ```kotlin
 * val atrina = AtrinaClient(
 *     baseUrl = "https://api.atrina.io/api/v1",
 *     apiKey = "atr_pk_production_..."
 * )
 *
 * // Signup
 * val session = atrina.auth.signup(
 *     email = "alice@example.com",
 *     password = "secret123",
 *     displayName = "Alice"
 * )
 *
 * // Work with data
 * val posts = atrina.data.table("posts")
 * val list = posts.list()
 * val post = posts.create(mapOf("title" to "Hello", "body" to "World"))
 * ```
 *
 * Requires: OkHttp 4.x (implementation("com.squareup.okhttp3:okhttp:4.12.0"))
 */

data class AtrinaConfig(
    val baseUrl: String,
    val apiKey: String,
    var userToken: String? = null,
    val timeoutMs: Long = 30_000,
    val retries: Int = 2,
)

class AtrinaError(
    val code: String,
    message: String,
    val status: Int,
    val details: Any? = null,
) : Exception(message)

class AtrinaClient(val config: AtrinaConfig) {
    val auth = Auth(this)
    val data = Data(this)
    val billing = Billing(this)
    val storage = Storage(this)

    private val client = OkHttpClient.Builder()
        .connectTimeout(config.timeoutMs, java.util.concurrent.TimeUnit.MILLISECONDS)
        .readTimeout(config.timeoutMs, java.util.concurrent.TimeUnit.MILLISECONDS)
        .build()

    fun setUserToken(token: String?) { config.userToken = token }
    fun getUserToken(): String? = config.userToken

    internal fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
        queryParams: Map<String, String> = emptyMap(),
    ): JSONObject {
        val urlBuilder = StringBuilder("${config.baseUrl}${path}")
        if (queryParams.isNotEmpty()) {
            urlBuilder.append("?")
            queryParams.entries.joinToString("&") { "${it.key}=${it.value}" }
                .let { urlBuilder.append(it) }
        }

        val builder = Request.Builder().url(urlBuilder.toString())
        builder.addHeader("x-atrina-key", config.apiKey)
        config.userToken?.let { builder.addHeader("Authorization", "Bearer $it") }

        if (body != null && (method == "POST" || method == "PATCH")) {
            builder.addHeader("Content-Type", "application/json")
            builder.method(method, body.toString().toRequestBody("application/json".toMediaType()))
        } else {
            builder.method(method, null)
        }

        var lastError: AtrinaError? = null
        for (attempt in 0..config.retries) {
            try {
                client.newCall(builder.build()).execute().use { response ->
                    val text = response.body?.string() ?: ""
                    val json = if (text.isNotEmpty()) JSONObject(text) else JSONObject()
                    if (!response.isSuccessful) {
                        if (response.code >= 500 && attempt < config.retries) {
                            Thread.sleep(500L * (1 shl attempt))
                            continue
                        }
                        val errObj = json.optJSONObject("error")
                        throw AtrinaError(
                            errObj?.optString("code", "HTTP_ERROR") ?: "HTTP_ERROR",
                            errObj?.optString("message", "HTTP ${response.code}") ?: "HTTP ${response.code}",
                            response.code,
                            json,
                        )
                    }
                    return json.optJSONObject("data") ?: json
                }
            } catch (e: AtrinaError) {
                if (e.status < 500) throw e
                lastError = e
            } catch (e: IOException) {
                lastError = AtrinaError("NETWORK_ERROR", e.message ?: "Network error", 0)
            }
            if (attempt < config.retries) Thread.sleep(500L * (1 shl attempt))
        }
        throw lastError ?: AtrinaError("UNKNOWN", "Unknown error", 0)
    }
}

// ============================================================
// Auth
// ============================================================

class Auth(private val client: AtrinaClient) {
    data class Session(val user: JSONObject, val token: String)

    fun signup(email: String, password: String, displayName: String? = null): Session {
        val body = JSONObject().apply {
            put("email", email); put("password", password)
            displayName?.let { put("displayName", it) }
        }
        val res = client.request("POST", "/auth/signup", body)
        val token = res.getString("token")
        client.setUserToken(token)
        return Session(res.getJSONObject("user"), token)
    }

    fun login(email: String, password: String): Session {
        val body = JSONObject().apply { put("email", email); put("password", password) }
        val res = client.request("POST", "/auth/login", body)
        val token = res.getString("token")
        client.setUserToken(token)
        return Session(res.getJSONObject("user"), token)
    }

    fun logout() {
        client.request("POST", "/auth/logout")
        client.setUserToken(null)
    }

    fun me(): JSONObject = client.request("GET", "/auth/me")

    fun forgotPassword(email: String) {
        client.request("POST", "/auth/password/forgot", JSONObject().apply { put("email", email) })
    }

    fun resetPassword(email: String, newPassword: String, resetToken: String) {
        val body = JSONObject().apply {
            put("email", email); put("newPassword", newPassword); put("resetToken", resetToken)
        }
        client.request("POST", "/auth/password/reset", body)
    }
}

// ============================================================
// Data
// ============================================================

class Data(private val client: AtrinaClient) {
    fun table(name: String) = Table(client, name)

    class Table internal constructor(private val client: AtrinaClient, private val name: String) {
        fun list(page: Int = 1, pageSize: Int = 20): JSONObject {
            return client.request("GET", "/data/$name", queryParams = mapOf("page" to page.toString(), "pageSize" to pageSize.toString()))
        }

        fun get(recordId: String): JSONObject = client.request("GET", "/data/$name/$recordId")

        fun create(data: Map<String, Any?>): JSONObject {
            val body = JSONObject(data)
            return client.request("POST", "/data/$name", body)
        }

        fun update(recordId: String, data: Map<String, Any?>): JSONObject {
            val body = JSONObject(data)
            return client.request("PATCH", "/data/$name/$recordId", body)
        }

        fun delete(recordId: String) { client.request("DELETE", "/data/$name/$recordId") }
    }
}

// ============================================================
// Billing
// ============================================================

class Billing(private val client: AtrinaClient) {
    fun products(): JSONObject = client.request("GET", "/billing/products")

    fun verifyPurchase(
        planId: String,
        purchaseToken: String,
        storeProductId: String,
        provider: String,
    ): JSONObject {
        val body = JSONObject().apply {
            put("planId", planId)
            put("purchaseToken", purchaseToken)
            put("storeProductId", storeProductId)
            put("provider", provider)
        }
        return client.request("POST", "/billing/purchases/verify", body)
    }

    fun subscriptions(): JSONObject = client.request("GET", "/billing/subscriptions")

    fun entitlements(): JSONObject = client.request("GET", "/billing/subscriptions")
}

// ============================================================
// Storage
// ============================================================

class Storage(private val client: AtrinaClient) {
    fun upload(fileBytes: ByteArray, fileName: String, contentType: String = "application/octet-stream"): JSONObject {
        val url = "${client.config.baseUrl}/storage/upload"
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("file", fileName, fileBytes.toRequestBody(contentType.toMediaType()))
            .build()
        val request = Request.Builder().url(url)
            .addHeader("x-atrina-key", client.config.apiKey)
            .client.config.userToken?.let { Request.Builder().addHeader("Authorization", "Bearer $it") }
            .post(body).build()
        client.let { c ->
            c.client.newCall(request).execute().use { res ->
                val text = res.body?.string() ?: ""
                if (!res.isSuccessful) throw AtrinaError("HTTP_ERROR", "HTTP ${res.code}", res.code)
                val json = JSONObject(text)
                return json.getJSONObject("data").getJSONObject("object")
            }
        }
    }
}
