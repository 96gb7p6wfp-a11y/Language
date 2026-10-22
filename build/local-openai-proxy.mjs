import * as http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";
import getRawBody from "raw-body";

export const LOCAL_OPENAI_MODULE = "virtual:phrase-local-openai-transport";
const resolvedModule = `\0${LOCAL_OPENAI_MODULE}`;
export const LOCAL_OPENAI_TOKEN_HEADER = "x-phrase-openai-dev";
export const LOCAL_OPENAI_JSON_LIMIT = 32 * 1024;
export const LOCAL_OPENAI_AUDIO_LIMIT = 2 * 1024 * 1024 + 64000;
export const LOCAL_OPENAI_RESPONSE_LIMIT = 32 * 1024;
const timeoutMs = 25000;
const bridgeMessage = "The local OpenAI transport is unavailable.";

/** Fixed provider host and exact paths: this is never a general-purpose proxy. */
export function allowedOpenAIRequest(method, requestPath) {
  if (method === "POST" && requestPath === "/v1/responses") return { limit: LOCAL_OPENAI_JSON_LIMIT, contentType: "application/json" };
  if (method === "POST" && requestPath === "/v1/audio/transcriptions") return { limit: LOCAL_OPENAI_AUDIO_LIMIT, contentType: "multipart/form-data" };
  // Model metadata is non-generative and permits an unpaid connectivity probe.
  if (method === "GET" && /^\/v1\/models\/[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(requestPath)) return { limit: 0, contentType: null };
  return null;
}

export function hasInheritedProxy(values = process.env) {
  return !!(values.HTTPS_PROXY || values.https_proxy || values.HTTP_PROXY || values.http_proxy);
}

/** Node 24's native agent respects the inherited proxy, NO_PROXY and CA trust. */
export function configureInheritedProxy(values = process.env, configure = http.setGlobalProxyFromEnv) {
  if (!hasInheritedProxy(values)) return () => {};
  if (typeof configure !== "function") throw new Error("Local OpenAI proxy support needs Node 24 or newer. Production and development without an HTTP proxy are unchanged.");
  try { return configure(values); }
  catch { throw new Error("The local OpenAI transport could not configure the inherited HTTP proxy."); }
}

function tokenMatches(supplied, expected) {
  if (typeof supplied !== "string") return false;
  const value = Buffer.from(supplied);
  return value.byteLength === expected.byteLength && timingSafeEqual(value, expected);
}
function sendError(response, status, code) {
  if (response.writableEnded || response.destroyed) return;
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ error: { code, message: bridgeMessage } }));
}
async function readBoundedResponse(response) {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > LOCAL_OPENAI_RESPONSE_LIMIT) { await response.body?.cancel(); throw new Error("response_too_large"); }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const pieces = [];
  let size = 0;
  try {
    while (true) {
      const piece = await reader.read();
      if (piece.done) break;
      size += piece.value.byteLength;
      if (size > LOCAL_OPENAI_RESPONSE_LIMIT) { await reader.cancel(); throw new Error("response_too_large"); }
      pieces.push(Buffer.from(piece.value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(pieces, size);
}

/**
 * Host-side development transport. It never reads an API key or an env file;
 * the authenticated Worker forwards its existing Authorization header in memory.
 * The injectable fetch is solely for transport unit tests, not an app mock mode.
 */
export async function createLocalOpenAIBridge({ upstreamFetch = globalThis.fetch, configureProxy = true, token = randomBytes(32).toString("hex") } = {}) {
  const expectedToken = Buffer.from(token);
  if (expectedToken.byteLength < 24) throw new Error("The local transport requires a strong session token.");
  const restoreProxy = configureProxy ? configureInheritedProxy() : () => {};
  let expectedHost;
  const server = http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const loopback = request.socket.remoteAddress === "127.0.0.1" || request.socket.remoteAddress === "::ffff:127.0.0.1";
    const browserRequest = ["origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"].some(name => request.headers[name] !== undefined);
    if (!loopback || request.headers.host !== expectedHost || browserRequest || !tokenMatches(request.headers[LOCAL_OPENAI_TOKEN_HEADER], expectedToken)) {
      request.resume(); sendError(response, 403, "local_transport_forbidden"); return;
    }
    const rule = allowedOpenAIRequest(request.method, request.url);
    if (!rule) { request.resume(); sendError(response, 404, "local_transport_path_denied"); return; }
    const contentType = request.headers["content-type"];
    if (rule.contentType && (typeof contentType !== "string" || contentType.split(";", 1)[0].trim().toLowerCase() !== rule.contentType)) {
      request.resume(); sendError(response, 415, "local_transport_content_type"); return;
    }
    if (request.method === "POST" && (typeof request.headers.authorization !== "string" || !/^Bearer .{1,1000}$/.test(request.headers.authorization))) {
      request.resume(); sendError(response, 403, "local_transport_authorization_required"); return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const cancel = () => controller.abort();
    request.once("aborted", cancel);
    response.once("close", () => { if (!response.writableEnded) cancel(); });
    try {
      const body = await getRawBody(request, { limit: rule.limit, length: request.headers["content-length"] });
      const headers = {};
      if (request.headers.authorization) headers.Authorization = request.headers.authorization;
      if (contentType) headers["Content-Type"] = contentType;
      const upstream = await upstreamFetch(`https://api.openai.com${request.url}`, {
        method: request.method,
        headers,
        ...(request.method === "POST" ? { body } : {}),
        redirect: "error",
        signal: controller.signal,
      });
      if (upstream.status >= 300 && upstream.status < 400) { await upstream.body?.cancel(); throw new Error("redirect_denied"); }
      const result = await readBoundedResponse(upstream);
      if (response.destroyed) return;
      response.statusCode = upstream.status;
      response.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
      const retryAfter = upstream.headers.get("retry-after");
      if (retryAfter && /^[0-9]{1,8}$/.test(retryAfter)) response.setHeader("Retry-After", retryAfter);
      // Node fetch decompresses upstream bodies; never forward content-encoding,
      // upstream content-length, cookies, credentials or bridge authentication.
      response.end(result);
    } catch (error) {
      request.resume();
      sendError(response, error?.type === "entity.too.large" ? 413 : controller.signal.aborted ? 504 : 502, error?.type === "entity.too.large" ? "local_transport_body_too_large" : "local_transport_unavailable");
    } finally {
      clearTimeout(timer);
      request.off("aborted", cancel);
    }
  });
  server.requestTimeout = timeoutMs + 2000;
  server.headersTimeout = 10000;
  server.on("clientError", (_error, socket) => { if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n"); });
  try {
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  } catch { restoreProxy(); throw new Error("The local OpenAI transport could not start."); }
  const address = server.address();
  expectedHost = `127.0.0.1:${address.port}`;
  let closed = false;
  return {
    origin: `http://${expectedHost}`,
    token,
    async close() {
      if (closed) return;
      closed = true;
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      restoreProxy();
    },
  };
}

/** The token and loopback address enter only a server virtual module in dev. */
export function createLocalOpenAITransportCode(bridge) {
  return `const workerFetch = globalThis.fetch.bind(globalThis);
export async function fetchThroughLocalOpenAI(input, init) {
  const target = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (target.origin !== "https://api.openai.com" || target.username || target.password || target.search || target.hash) throw new Error("Local OpenAI destination denied.");
  const method = String(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const allowed = (method === "POST" && ["/v1/responses", "/v1/audio/transcriptions"].includes(target.pathname)) || (method === "GET" && /^\\/v1\\/models\\/[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(target.pathname));
  if (!allowed) throw new Error("Local OpenAI path denied.");
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  headers.set(${JSON.stringify(LOCAL_OPENAI_TOKEN_HEADER)}, ${JSON.stringify(bridge.token)});
  return workerFetch(${JSON.stringify(bridge.origin)} + target.pathname, { ...init, method, headers });
}`;
}

function assertServerEnvironment(context, options) {
  const name = context.environment?.name;
  if (name === "client" || (!name && !options?.ssr)) throw new Error("The local OpenAI transport is available only in server routes.");
}

/** @returns {import('vite').Plugin} */
export function localOpenAIProxy() {
  let bridge;
  let server;
  let targetFile;
  let enabled = false;
  return {
    name: "phrase-local-openai-proxy",
    apply: "serve",
    enforce: "pre",
    configResolved(config) {
      enabled = hasInheritedProxy();
      targetFile = path.join(config.root, "lib", "mission-ai.ts").replaceAll("\\", "/");
    },
    async configureServer(vite) {
      server = vite;
      if (!enabled) return;
      bridge = await createLocalOpenAIBridge();
      server.httpServer?.once("close", () => { void bridge?.close(); });
      server.watcher.once("close", () => { void bridge?.close(); });
    },
    resolveId(id) { if (id === LOCAL_OPENAI_MODULE) return resolvedModule; },
    load(id, options) {
      if (id !== resolvedModule) return;
      assertServerEnvironment(this, options);
      if (!enabled || !bridge) throw new Error("The local OpenAI server transport is not running.");
      return createLocalOpenAITransportCode(bridge);
    },
    transform(code, id, options) {
      if (!enabled || id.split("?", 1)[0].replaceAll("\\", "/") !== targetFile) return;
      assertServerEnvironment(this, options);
      const signature = "fetchImpl: typeof fetch = fetch";
      if (!code.includes(signature)) throw new Error("The local OpenAI transport could not locate the server fetch defaults.");
      return {
        code: `import { fetchThroughLocalOpenAI as __phraseLocalOpenAIFetch } from ${JSON.stringify(LOCAL_OPENAI_MODULE)};\n${code.replaceAll(signature, "fetchImpl: typeof fetch = __phraseLocalOpenAIFetch")}`,
        map: null,
      };
    },
    async closeBundle() { await bridge?.close(); },
  };
}
