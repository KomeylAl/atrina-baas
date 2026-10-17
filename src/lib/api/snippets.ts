/**
 * Code snippet generator for Atrina BaaS data plane API.
 *
 * For each (method, path, body, authKind) combination, generates ready-to-paste
 * code snippets in 6 languages: curl, JavaScript (fetch), Dart, Kotlin, Swift,
 * Python (requests).
 *
 * The generator is pure — given the inputs, it returns string snippets.
 */

export type SnippetLang = "curl" | "javascript" | "dart" | "kotlin" | "swift" | "python";

export type SnippetInput = {
  baseUrl: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: Record<string, unknown> | null;
  apiKey?: string; // raw publishable or server key, e.g. "atr_pk_production_..."
  userToken?: string | null; // user session token (optional)
};

export const SNIPPET_LANGS: Array<{ id: SnippetLang; label: string; icon: string }> = [
  { id: "curl", label: "cURL", icon: "⌘" },
  { id: "javascript", label: "JavaScript", icon: "JS" },
  { id: "dart", label: "Dart / Flutter", icon: "D" },
  { id: "kotlin", label: "Kotlin / Android", icon: "K" },
  { id: "swift", label: "Swift / iOS", icon: "S" },
  { id: "python", label: "Python", icon: "Py" },
];

export function generateSnippet(lang: SnippetLang, input: SnippetInput): string {
  switch (lang) {
    case "curl": return curl(input);
    case "javascript": return javascript(input);
    case "dart": return dart(input);
    case "kotlin": return kotlin(input);
    case "swift": return swift(input);
    case "python": return python(input);
  }
}

// ============================================================
// cURL
// ============================================================

function curl(input: SnippetInput): string {
  const url = `${input.baseUrl}${input.path}`;
  const lines = [`curl -X ${input.method} '${url}'`];
  lines.push(`  -H 'Content-Type: application/json'`);
  if (input.apiKey) lines.push(`  -H 'x-atrina-key: ${input.apiKey}'`);
  if (input.userToken) lines.push(`  -H 'Authorization: Bearer ${input.userToken}'`);
  if (input.body && (input.method === "POST" || input.method === "PATCH")) {
    lines.push(`  -d '${JSON.stringify(input.body)}'`);
  }
  return lines.join(" \\\n");
}

// ============================================================
// JavaScript (fetch)
// ============================================================

function javascript(input: SnippetInput): string {
  const url = `${input.baseUrl}${input.path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.apiKey) headers["x-atrina-key"] = input.apiKey;
  if (input.userToken) headers["Authorization"] = `Bearer ${input.userToken}`;

  const lines: string[] = [];
  lines.push(`const res = await fetch("${url}", {`);
  lines.push(`  method: "${input.method}",`);
  lines.push(`  headers: ${JSON.stringify(headers, null, 2).split("\n").join("\n  ")},`);
  if (input.body && (input.method === "POST" || input.method === "PATCH")) {
    lines.push(`  body: JSON.stringify(${JSON.stringify(input.body, null, 2)}),`);
  }
  lines.push(`});`);
  lines.push(`const data = await res.json();`);
  lines.push(`console.log(data);`);
  return lines.join("\n");
}

// ============================================================
// Dart (Flutter, http package)
// ============================================================

function dart(input: SnippetInput): string {
  const url = `${input.baseUrl}${input.path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.apiKey) headers["x-atrina-key"] = input.apiKey;
  if (input.userToken) headers["Authorization"] = `Bearer ${input.userToken}`;

  const lines: string[] = [];
  lines.push(`import 'package:http/http.dart' as http;`);
  lines.push(`import 'dart:convert';`);
  lines.push("");
  lines.push(`final res = await http.${dartMethod(input.method)}(`);
  lines.push(`  Uri.parse('${url}'),`);
  lines.push(`  headers: ${dartMap(headers)},`);
  if (input.body && (input.method === "POST" || input.method === "PATCH")) {
    lines.push(`  body: jsonEncode(${JSON.stringify(input.body, null, 2)}),`);
  }
  lines.push(`);`);
  lines.push(`final data = jsonDecode(res.body);`);
  lines.push(`print(data);`);
  return lines.join("\n");
}

function dartMethod(m: SnippetInput["method"]): string {
  return m === "GET" ? "get" : m === "POST" ? "post" : m === "PATCH" ? "patch" : "delete";
}

function dartMap(headers: Record<string, string>): string {
  const entries = Object.entries(headers).map(([k, v]) => `    '${k}': '${v}'`).join(",\n");
  return `{\n${entries}\n  }`;
}

// ============================================================
// Kotlin (Android, OkHttp)
// ============================================================

function kotlin(input: SnippetInput): string {
  const url = `${input.baseUrl}${input.path}`;
  const lines: string[] = [];
  lines.push(`val client = OkHttpClient()`);
  lines.push(`val mediaType = "application/json; charset=utf-8".toMediaType()`);
  if (input.body && (input.method === "POST" || input.method === "PATCH")) {
    lines.push(`val body = """${JSON.stringify(input.body)}""".toRequestBody(mediaType)`);
  }
  const builderLines = [
    `  .url("${url}")`,
    `  .${input.method.toLowerCase()}(${input.body && (input.method === "POST" || input.method === "PATCH") ? "body" : ""})`,
  ];
  if (input.apiKey) builderLines.push(`  .addHeader("x-atrina-key", "${input.apiKey}")`);
  if (input.userToken) builderLines.push(`  .addHeader("Authorization", "Bearer ${input.userToken}")`);
  lines.push(`val request = Request.Builder()`);
  lines.push(...builderLines);
  lines.push(`  .build()`);
  lines.push(`val response = client.newCall(request).execute()`);
  lines.push(`val data = response.body!!.string()`);
  lines.push(`println(data)`);
  return lines.join("\n");
}

// ============================================================
// Swift (iOS, URLSession)
// ============================================================

function swift(input: SnippetInput): string {
  const url = `${input.baseUrl}${input.path}`;
  const lines: string[] = [];
  lines.push(`let url = URL(string: "${url}")!`);
  lines.push(`var request = URLRequest(url: url)`);
  lines.push(`request.httpMethod = "${input.method}"`);
  lines.push(`request.setValue("application/json", forHTTPHeaderField: "Content-Type")`);
  if (input.apiKey) lines.push(`request.setValue("${input.apiKey}", forHTTPHeaderField: "x-atrina-key")`);
  if (input.userToken) lines.push(`request.setValue("Bearer ${input.userToken}", forHTTPHeaderField: "Authorization")`);
  if (input.body && (input.method === "POST" || input.method === "PATCH")) {
    lines.push(`let bodyData = try! JSONSerialization.data(withJSONObject: ${JSON.stringify(input.body, null, 2).replace(/"/g, "\"")})`);
    lines.push(`request.httpBody = bodyData`);
  }
  lines.push("");
  lines.push(`let task = URLSession.shared.dataTask(with: request) { data, response, error in`);
  lines.push(`  guard let data = data, error == nil else { return }`);
  lines.push(`  let json = try? JSONSerialization.jsonObject(with: data)`);
  lines.push(`  print(json ?? "")`);
  lines.push(`}`);
  lines.push(`task.resume()`);
  return lines.join("\n");
}

// ============================================================
// Python (requests)
// ============================================================

function python(input: SnippetInput): string {
  const url = `${input.baseUrl}${input.path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.apiKey) headers["x-atrina-key"] = input.apiKey;
  if (input.userToken) headers["Authorization"] = `Bearer ${input.userToken}`;

  const lines: string[] = [];
  lines.push(`import requests`);
  lines.push("");
  lines.push(`url = "${url}"`);
  lines.push(`headers = ${JSON.stringify(headers, null, 4)}`);
  if (input.body && (input.method === "POST" || input.method === "PATCH")) {
    lines.push(`payload = ${JSON.stringify(input.body, null, 4)}`);
  }
  lines.push("");
  lines.push(`response = requests.${pythonMethod(input.method)}(`);
  lines.push(`  url,`);
  lines.push(`  headers=headers,`);
  if (input.body && (input.method === "POST" || input.method === "PATCH")) {
    lines.push(`  json=payload,`);
  }
  lines.push(`)`);
  lines.push(`print(response.json())`);
  return lines.join("\n");
}

function pythonMethod(m: SnippetInput["method"]): string {
  return m === "GET" ? "get" : m === "POST" ? "post" : m === "PATCH" ? "patch" : "delete";
}
