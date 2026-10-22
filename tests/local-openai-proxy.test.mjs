import test from "node:test";
import assert from "node:assert/strict";
import * as http from "node:http";
import { readFileSync } from "node:fs";
import { allowedOpenAIRequest, configureInheritedProxy, createLocalOpenAIBridge, createLocalOpenAITransportCode, hasInheritedProxy, LOCAL_OPENAI_AUDIO_LIMIT, LOCAL_OPENAI_JSON_LIMIT, LOCAL_OPENAI_MODULE, LOCAL_OPENAI_RESPONSE_LIMIT, LOCAL_OPENAI_TOKEN_HEADER, localOpenAIProxy } from "../build/local-openai-proxy.mjs";

const testToken = "unit-test-only-local-transport-token";
async function withBridge(work, upstreamFetch = async () => Response.json({ ok: true })) {
  const bridge = await createLocalOpenAIBridge({ upstreamFetch, token: testToken, configureProxy: false });
  try { await work(bridge); } finally { await bridge.close(); }
}
function send(bridge, path, { method = "GET", token = testToken, headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(bridge.origin);
    const request = http.request({ hostname: url.hostname, port: url.port, path, method, agent: new http.Agent({ keepAlive: false }), headers: { ...(token ? { [LOCAL_OPENAI_TOKEN_HEADER]: token } : {}), ...(body !== undefined ? { "Content-Length": Buffer.byteLength(body) } : {}), ...headers } }, response => {
      const pieces = []; response.on("data", piece => pieces.push(piece)); response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, text: Buffer.concat(pieces).toString("utf8") }));
    });
    request.on("error", reject); request.end(body);
  });
}
const postHeaders = { Authorization: "Bearer unit-test-never-a-real-key", "Content-Type": "application/json" };

test("destination allowlist accepts only fixed OpenAI methods and exact paths", () => {
  assert.ok(allowedOpenAIRequest("POST", "/v1/responses"));
  assert.ok(allowedOpenAIRequest("POST", "/v1/audio/transcriptions"));
  assert.ok(allowedOpenAIRequest("GET", "/v1/models/gpt-4.1-mini"));
  for (const [method, path] of [["GET", "/v1/responses"], ["POST", "/v1/chat/completions"], ["POST", "/v1/responses?url=evil"], ["POST", "https://evil.example/v1/responses"], ["CONNECT", "api.openai.com:443"], ["GET", "/v1/models/.."], ["GET", "/v1/models/%2e%2e"], ["GET", "/v1/models/gpt-4.1-mini?x=1"]]) assert.equal(allowedOpenAIRequest(method, path), null);
});

test("proxy configuration preserves inherited settings and fails safely on unsupported Node", () => {
  assert.equal(hasInheritedProxy({}), false);
  assert.equal(hasInheritedProxy({ HTTPS_PROXY: "http://proxy.invalid:8080" }), true);
  let received; let restored = false;
  const settings = { HTTPS_PROXY: "http://proxy.invalid:8080", NO_PROXY: "localhost", NODE_EXTRA_CA_CERTS: "/trusted/session-ca.pem" };
  const restore = configureInheritedProxy(settings, values => { received = values; return () => { restored = true; }; });
  assert.strictEqual(received, settings); restore(); assert.equal(restored, true);
  assert.doesNotThrow(() => configureInheritedProxy({}, undefined));
  assert.throws(() => configureInheritedProxy(settings, null), /Node 24/);
  assert.throws(() => configureInheritedProxy(settings, () => { throw new Error("private-proxy-value"); }), error => !error.message.includes("private-proxy-value"));
});

test("bridge binds loopback and rejects missing or wrong session authentication before upstream", async () => {
  let calls = 0;
  await withBridge(async bridge => {
    assert.equal(new URL(bridge.origin).hostname, "127.0.0.1");
    assert.equal((await send(bridge, "/v1/models/gpt-4.1-mini", { token: null })).status, 403);
    assert.equal((await send(bridge, "/v1/models/gpt-4.1-mini", { token: "wrong-token" })).status, 403);
    assert.equal(calls, 0);
  }, async () => { calls++; return Response.json({}); });
});

test("browser requests and rebinding Host values are denied even with a session token", async () => {
  let calls = 0;
  await withBridge(async bridge => {
    for (const headers of [{ Origin: "http://localhost:5173" }, { "Sec-Fetch-Site": "same-origin" }, { "Sec-Fetch-Mode": "cors" }, { "Sec-Fetch-Dest": "empty" }, { Host: "attacker.example" }]) assert.equal((await send(bridge, "/v1/models/gpt-4.1-mini", { headers })).status, 403);
    assert.equal(calls, 0);
  }, async () => { calls++; return Response.json({}); });
});

test("unknown paths, wrong content types and unauthenticated POST requests never reach upstream", async () => {
  let calls = 0;
  await withBridge(async bridge => {
    assert.equal((await send(bridge, "/v1/chat/completions", { method: "POST", headers: postHeaders, body: "{}" })).status, 404);
    assert.equal((await send(bridge, "/v1/responses", { method: "POST", headers: { Authorization: postHeaders.Authorization, "Content-Type": "text/plain" }, body: "{}" })).status, 415);
    assert.equal((await send(bridge, "/v1/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 403);
    assert.equal(calls, 0);
  }, async () => { calls++; return Response.json({}); });
});

test("transport forwards the real request in memory to the fixed provider and strips bridge/browser headers", async () => {
  let observed;
  await withBridge(async bridge => {
    const response = await send(bridge, "/v1/responses", { method: "POST", headers: { ...postHeaders, Cookie: "private-cookie", "X-Other": "drop-me" }, body: '{"answer":"a concrete user answer"}' });
    assert.equal(response.status, 200);
    assert.equal(response.headers["set-cookie"], undefined);
    assert.equal(response.headers[LOCAL_OPENAI_TOKEN_HEADER], undefined);
    assert.equal(response.headers["content-encoding"], undefined);
    assert.deepEqual(JSON.parse(response.text), { output: "real upstream bytes" });
    assert.equal(observed.url, "https://api.openai.com/v1/responses");
    assert.equal(observed.options.redirect, "error");
    assert.equal(observed.options.headers.Authorization, postHeaders.Authorization);
    assert.equal(observed.options.headers.Cookie, undefined);
    assert.equal(observed.options.headers[LOCAL_OPENAI_TOKEN_HEADER], undefined);
    assert.equal(observed.options.body.toString(), '{"answer":"a concrete user answer"}');
    assert.ok(observed.options.signal instanceof AbortSignal);
  }, async (url, options) => { observed = { url, options }; return new Response('{"output":"real upstream bytes"}', { headers: { "Content-Type": "application/json", "Set-Cookie": "should-not-leave-server", "Content-Encoding": "gzip" } }); });
});

test("metadata probe permits a non-generative GET without an API credential", async () => {
  let observed;
  await withBridge(async bridge => {
    const response = await send(bridge, "/v1/models/gpt-4.1-mini"); assert.equal(response.status, 401);
    assert.equal(observed.url, "https://api.openai.com/v1/models/gpt-4.1-mini"); assert.equal(observed.options.headers.Authorization, undefined);
  }, async (url, options) => { observed = { url, options }; return new Response('{"error":{"code":"missing_api_key"}}', { status: 401 }); });
});

test("text and audio upload limits reject oversize requests without a provider call", async () => {
  let calls = 0;
  await withBridge(async bridge => {
    assert.equal((await send(bridge, "/v1/responses", { method: "POST", headers: postHeaders, body: Buffer.alloc(LOCAL_OPENAI_JSON_LIMIT + 1) })).status, 413);
    assert.equal((await send(bridge, "/v1/audio/transcriptions", { method: "POST", headers: { Authorization: postHeaders.Authorization, "Content-Type": "multipart/form-data; boundary=test" }, body: Buffer.alloc(LOCAL_OPENAI_AUDIO_LIMIT + 1) })).status, 413);
    assert.equal(calls, 0);
  }, async () => { calls++; return Response.json({}); });
});

test("audio bytes and multipart boundary pass unchanged within the upload cap", async () => {
  const body = Buffer.from("--unit-test\r\nContent-Disposition: form-data; name=audio\r\n\r\naudio bytes\r\n--unit-test--\r\n");
  let observed;
  await withBridge(async bridge => {
    const result = await send(bridge, "/v1/audio/transcriptions", { method: "POST", headers: { Authorization: postHeaders.Authorization, "Content-Type": "multipart/form-data; boundary=unit-test" }, body });
    assert.equal(result.status, 200); assert.equal(observed.url, "https://api.openai.com/v1/audio/transcriptions"); assert.deepEqual(observed.options.body, body); assert.equal(observed.options.headers["Content-Type"], "multipart/form-data; boundary=unit-test");
  }, async (url, options) => { observed = { url, options }; return Response.json({ text: "A real transcript." }); });
});

test("oversized upstream responses, redirects and network failures are sanitized", async () => {
  for (const upstream of [async () => new Response("x".repeat(LOCAL_OPENAI_RESPONSE_LIMIT + 1)), async () => new Response(null, { status: 302, headers: { location: "https://untrusted.example" } }), async () => { throw new Error("sensitive-header-value"); }]) await withBridge(async bridge => {
    const response = await send(bridge, "/v1/responses", { method: "POST", headers: postHeaders, body: "{}" }); assert.equal(response.status, 502); assert.ok(!response.text.includes("sensitive-header-value")); assert.ok(!response.text.includes(testToken));
  }, upstream);
});

test("virtual transport denies alternate destinations and only injects token in server modules", async () => {
  const plugin = localOpenAIProxy(); assert.equal(plugin.apply, "serve");
  const oldProxy = process.env.HTTPS_PROXY;
  process.env.HTTPS_PROXY = "http://proxy.invalid:8080";
  try {
    plugin.configResolved({ root: "/test-project" });
    const code = "export function example(fetchImpl: typeof fetch = fetch) { return fetchImpl; }";
    assert.throws(() => plugin.transform.call({ environment: { name: "client" } }, code, "/test-project/lib/mission-ai.ts", {}), /only in server/);
    assert.throws(() => plugin.load.call({ environment: { name: "client" } }, `\0${LOCAL_OPENAI_MODULE}`, {}), /only in server/);
    const transformed = plugin.transform.call({ environment: { name: "rsc" } }, code, "/test-project/lib/mission-ai.ts", {});
    assert.match(transformed.code, /fetchThroughLocalOpenAI/); assert.match(transformed.code, /__phraseLocalOpenAIFetch/);
    assert.equal(plugin.transform.call({ environment: { name: "rsc" } }, code, "/test-project/app/page.tsx", {}), undefined);
  } finally { if (oldProxy === undefined) delete process.env.HTTPS_PROXY; else process.env.HTTPS_PROXY = oldProxy; }
  const virtual = createLocalOpenAITransportCode({ origin: "http://127.0.0.1:12345", token: testToken });
  assert.match(virtual, /https:\/\/api\.openai\.com/); assert.match(virtual, /destination denied/); assert.match(virtual, /target\.search/);
  assert.ok(!readFileSync(new URL("../lib/mission-ai.ts", import.meta.url), "utf8").includes(LOCAL_OPENAI_MODULE));
  const vite = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8"); assert.match(vite, /command === "serve" \? \[localOpenAIProxy\(\)\] : \[\]/);
});
