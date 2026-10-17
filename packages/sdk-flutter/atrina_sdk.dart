// ============================================================
// Atrina BaaS — Flutter / Dart SDK
//
// Quick start:
//
//   final atrina = AtrinaClient(
//     baseUrl: 'https://api.atrina.io/api/v1',
//     apiKey: 'atr_pk_production_...',
//   );
//
//   // Signup
//   final session = await atrina.auth.signup(
//     email: 'alice@example.com',
//     password: 'secret123',
//     displayName: 'Alice',
//   );
//
//   // Work with data
//   final posts = atrina.data.table('posts');
//   final list = await posts.list();
//   final post = await posts.create({'title': 'Hello', 'body': 'World'});
//
// Requires: http package (flutter pub add http)
// ============================================================

import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

class AtrinaConfig {
  final String baseUrl;
  final String apiKey;
  String? userToken;
  final Duration timeout;
  final int retries;

  AtrinaConfig({
    required this.baseUrl,
    required this.apiKey,
    this.userToken,
    this.timeout = const Duration(seconds: 30),
    this.retries = 2,
  });
}

class AtrinaError implements Exception {
  final String code;
  final String message;
  final int status;
  final dynamic details;

  AtrinaError(this.code, this.message, this.status, [this.details]);

  @override
  String toString() => 'AtrinaError($code): $message (status: $status)';
}

class AtrinaClient {
  final AtrinaConfig config;
  late final Auth auth;
  late final Data data;
  late final Billing billing;
  late final Storage storage;

  AtrinaClient(this.config) {
    auth = Auth(this);
    data = Data(this);
    billing = Billing(this);
    storage = Storage(this);
  }

  void setUserToken(String? token) => config.userToken = token;
  String? getUserToken() => config.userToken;

  Future<Map<String, dynamic>> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    var url = '${config.baseUrl}$path';
    if (queryParams != null && queryParams.isNotEmpty) {
      final qs = queryParams.entries.map((e) => '${e.key}=${e.value}').join('&');
      url += '?$qs';
    }

    final headers = <String, String>{
      'x-atrina-key': config.apiKey,
    };
    if (config.userToken != null) {
      headers['Authorization'] = 'Bearer ${config.userToken}';
    }

    String? bodyStr;
    if (body != null && (method == 'POST' || method == 'PATCH')) {
      headers['Content-Type'] = 'application/json';
      bodyStr = jsonEncode(body);
    }

    AtrinaError? lastError;
    for (var attempt = 0; attempt <= config.retries; attempt++) {
      try {
        final res = await http.Request(method, Uri.parse(url))
          ..headers.addAll(headers)
          ..body = bodyStr ?? ''
          ..timeout = config.timeout;
        final streamed = await res.send();
        final response = await http.Response.fromStream(streamed);

        final json = response.body.isNotEmpty
            ? jsonDecode(response.body) as Map<String, dynamic>
            : <String, dynamic>{};

        if (response.statusCode < 200 || response.statusCode >= 300) {
          if (response.statusCode >= 500 && attempt < config.retries) {
            await Future.delayed(Duration(milliseconds: 500 * (1 << attempt)));
            continue;
          }
          final err = json['error'] as Map<String, dynamic>?;
          throw AtrinaError(
            err?['code'] as String? ?? 'HTTP_ERROR',
            err?['message'] as String? ?? 'HTTP ${response.statusCode}',
            response.statusCode,
            json,
          );
        }
        return (json['data'] as Map<String, dynamic>?) ?? json;
      } on AtrinaError catch (e) {
        if (e.status < 500) rethrow;
        lastError = e;
      } catch (e) {
        lastError = AtrinaError('NETWORK_ERROR', e.toString(), 0);
      }
      if (attempt < config.retries) {
        await Future.delayed(Duration(milliseconds: 500 * (1 << attempt)));
      }
    }
    throw lastError ?? AtrinaError('UNKNOWN', 'Unknown error', 0);
  }
}

// ============================================================
// Auth
// ============================================================

class Auth {
  final AtrinaClient _client;
  Auth(this._client);

  Future<Map<String, dynamic>> signup({
    required String email,
    required String password,
    String? displayName,
  }) async {
    final body = <String, dynamic>{'email': email, 'password': password};
    if (displayName != null) body['displayName'] = displayName;
    final res = await _client.request('POST', '/auth/signup', body: body);
    final token = res['token'] as String?;
    if (token != null) _client.setUserToken(token);
    return res;
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final res = await _client.request('POST', '/auth/login', body: {
      'email': email, 'password': password,
    });
    final token = res['token'] as String?;
    if (token != null) _client.setUserToken(token);
    return res;
  }

  Future<void> logout() async {
    await _client.request('POST', '/auth/logout');
    _client.setUserToken(null);
  }

  Future<Map<String, dynamic>> me() async => _client.request('GET', '/auth/me');

  Future<void> forgotPassword(String email) async {
    await _client.request('POST', '/auth/password/forgot', body: {'email': email});
  }

  Future<void> resetPassword({
    required String email,
    required String newPassword,
    required String resetToken,
  }) async {
    await _client.request('POST', '/auth/password/reset', body: {
      'email': email, 'newPassword': newPassword, 'resetToken': resetToken,
    });
  }
}

// ============================================================
// Data
// ============================================================

class Data {
  final AtrinaClient _client;
  Data(this._client);

  Table table(String name) => Table(_client, name);
}

class Table {
  final AtrinaClient _client;
  final String name;
  Table(this._client, this.name);

  Future<Map<String, dynamic>> list({int page = 1, int pageSize = 20}) async {
    return _client.request('GET', '/data/$name', queryParams: {
      'page': page.toString(), 'pageSize': pageSize.toString(),
    });
  }

  Future<Map<String, dynamic>> get(String recordId) async {
    return _client.request('GET', '/data/$name/$recordId');
  }

  Future<Map<String, dynamic>> create(Map<String, dynamic> data) async {
    return _client.request('POST', '/data/$name', body: data);
  }

  Future<Map<String, dynamic>> update(String recordId, Map<String, dynamic> data) async {
    return _client.request('PATCH', '/data/$name/$recordId', body: data);
  }

  Future<void> delete(String recordId) async {
    await _client.request('DELETE', '/data/$name/$recordId');
  }
}

// ============================================================
// Billing
// ============================================================

class Billing {
  final AtrinaClient _client;
  Billing(this._client);

  Future<Map<String, dynamic>> products() async {
    return _client.request('GET', '/billing/products');
  }

  Future<Map<String, dynamic>> verifyPurchase({
    required String planId,
    required String purchaseToken,
    required String storeProductId,
    required String provider,
  }) async {
    return _client.request('POST', '/billing/purchases/verify', body: {
      'planId': planId, 'purchaseToken': purchaseToken,
      'storeProductId': storeProductId, 'provider': provider,
    });
  }

  Future<Map<String, dynamic>> subscriptions() async {
    return _client.request('GET', '/billing/subscriptions');
  }
}

// ============================================================
// Storage
// ============================================================

class Storage {
  final AtrinaClient _client;
  Storage(this._client);

  Future<Map<String, dynamic>> upload(
    List<int> fileBytes,
    String fileName, {
    String contentType = 'application/octet-stream',
  }) async {
    final uri = Uri.parse('${_client.config.baseUrl}/storage/upload');
    final request = http.MultipartRequest('POST', uri)
      ..headers['x-atrina-key'] = _client.config.apiKey
      ..files.add(http.MultipartFile.fromBytes('file', fileBytes, filename: fileName));

    if (_client.config.userToken != null) {
      request.headers['Authorization'] = 'Bearer ${_client.config.userToken}';
    }

    final response = await request.send().timeout(_client.config.timeout);
    final body = await response.stream.bytesToString();
    final json = jsonDecode(body) as Map<String, dynamic>;
    return (json['data'] as Map<String, dynamic>?) ?? json;
  }
}
