import http from "node:http";
import { createDecartClient } from "@decartai/sdk";

const port = Number.parseInt(process.env.PORT || "8787", 10);
const apiKey = process.env.DECART_API_KEY;
const productionOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const requestLog = new Map();

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", "http://127.0.0.1").pathname;
  const origin = request.headers.origin || "";
  const allowedOrigin = resolveAllowedOrigin(origin);

  if (allowedOrigin) {
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (request.method === "OPTIONS") {
    response.writeHead(allowedOrigin ? 204 : 403).end();
    return;
  }

  if (request.method === "GET" && pathname === "/health") {
    json(response, 200, { ok: true, configured: Boolean(apiKey) });
    return;
  }

  if (request.method !== "POST" || pathname !== "/api/decart/token") {
    json(response, 404, { error: "Not found" });
    return;
  }

  if (origin && !allowedOrigin) {
    json(response, 403, { error: "Origin not allowed" });
    return;
  }

  const clientAddress = request.socket.remoteAddress || "unknown";
  if (!consumeRateLimit(clientAddress)) {
    json(response, 429, { error: "Too many try-on sessions. Please wait and try again." });
    return;
  }

  if (!apiKey) {
    json(response, 503, { error: "The generation service is not configured." });
    return;
  }

  try {
    const client = createDecartClient({ apiKey });
    const token = await client.tokens.create({
      expiresIn: 60,
      allowedModels: ["lucy-vton-latest"],
      constraints: { realtime: { maxSessionDuration: 90 } },
      metadata: { client: "tryiton-extension" },
    });
    json(response, 200, token);
  } catch (error) {
    console.error("Failed to create realtime client token", error);
    json(response, 502, { error: "Could not start the camera service." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Try-on service listening at http://127.0.0.1:${port}`);
});

function resolveAllowedOrigin(origin) {
  if (!origin) return "";
  if (productionOrigins.has(origin)) return origin;
  if (productionOrigins.size === 0 && origin.startsWith("chrome-extension://")) return origin;
  return "";
}

function consumeRateLimit(address) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxRequests = 30;
  const existing = requestLog.get(address) || [];
  const recent = existing.filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= maxRequests) return false;
  recent.push(now);
  requestLog.set(address, recent);
  return true;
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
