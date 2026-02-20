import http from "node:http";

const PORT = Number(process.env.AI_BACKEND_PORT || 8787);
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || "gpt-5-mini").trim();
const FIREBASE_WEB_API_KEY = String(
  process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || ""
).trim();
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const TOKEN_LOOKUP_URL = FIREBASE_WEB_API_KEY
  ? `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(FIREBASE_WEB_API_KEY)}`
  : "";
const RAW_ALLOWED_ORIGINS = String(
  process.env.AI_BACKEND_ALLOW_ORIGINS || process.env.AI_BACKEND_ALLOW_ORIGIN || ""
).trim();
const RATE_LIMIT_MAX = Number(process.env.AI_BACKEND_RATE_LIMIT_MAX || 30);
const RATE_LIMIT_WINDOW_MS = Number(process.env.AI_BACKEND_RATE_LIMIT_WINDOW_MS || 60_000);
const BODY_SIZE_LIMIT = 1_500_000;

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost",
  "http://localhost:5173",
  "capacitor://localhost",
];

function parseAllowedOrigins(raw) {
  if (!raw) return new Set(DEFAULT_ALLOWED_ORIGINS);
  const parsed = raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  if (!parsed.length) return new Set(DEFAULT_ALLOWED_ORIGINS);
  if (parsed.includes("*")) return new Set(["*"]);
  return new Set(parsed);
}

const ALLOWED_ORIGINS = parseAllowedOrigins(RAW_ALLOWED_ORIGINS);
const rateLimitStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, row] of rateLimitStore.entries()) {
    if (!row || now >= row.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 30_000).unref();

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
}

function getOrigin(req) {
  const origin = req.headers.origin;
  return typeof origin === "string" ? origin.trim() : "";
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has("*")) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function applyCors(req, res) {
  const origin = getOrigin(req);
  if (!isOriginAllowed(origin)) return false;

  if (origin) {
    const allowedOrigin = ALLOWED_ORIGINS.has("*") ? "*" : origin;
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return true;
}

function writeJson(req, res, code, payload) {
  setSecurityHeaders(res);
  applyCors(req, res);
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > BODY_SIZE_LIMIT) {
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function bearerToken(req) {
  const value = String(req.headers.authorization || "");
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? String(match[1] || "").trim() : "";
}

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return String(req.socket?.remoteAddress || "unknown");
}

function applyRateLimit(res, key) {
  const limit = Number.isFinite(RATE_LIMIT_MAX) && RATE_LIMIT_MAX > 0 ? RATE_LIMIT_MAX : 30;
  const windowMs =
    Number.isFinite(RATE_LIMIT_WINDOW_MS) && RATE_LIMIT_WINDOW_MS > 0 ? RATE_LIMIT_WINDOW_MS : 60_000;
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  let row = existing;

  if (!row || now >= row.resetAt) {
    row = { count: 0, resetAt: now + windowMs };
  }

  row.count += 1;
  rateLimitStore.set(key, row);

  const remaining = Math.max(0, limit - row.count);
  const resetSec = Math.max(0, Math.ceil((row.resetAt - now) / 1000));
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(resetSec));

  return row.count > limit;
}

async function verifyFirebaseUser(req) {
  if (!TOKEN_LOOKUP_URL) {
    return { ok: false, status: 500, error: "Server missing FIREBASE_WEB_API_KEY" };
  }
  const idToken = bearerToken(req);
  if (!idToken) {
    return { ok: false, status: 401, error: "Missing Authorization bearer token" };
  }

  try {
    const verifyRes = await fetch(TOKEN_LOOKUP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const payload = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok) {
      return { ok: false, status: 401, error: "Invalid auth token" };
    }

    const uid = payload?.users?.[0]?.localId;
    if (!uid) {
      return { ok: false, status: 401, error: "Invalid auth token" };
    }
    return { ok: true, uid };
  } catch {
    return { ok: false, status: 502, error: "Auth verification unavailable" };
  }
}

function normalizeIncomingRequest(incoming) {
  const modelCandidate = String(incoming?.model || OPENAI_MODEL).trim();
  const safeModel = /^[a-zA-Z0-9._:-]{1,80}$/.test(modelCandidate) ? modelCandidate : OPENAI_MODEL;
  const input = Array.isArray(incoming?.input) ? incoming.input : [];
  const maxTokensRaw = Number(incoming?.max_output_tokens || 420);
  const maxTokens = Number.isFinite(maxTokensRaw) ? Math.max(64, Math.min(900, Math.round(maxTokensRaw))) : 420;
  return { model: safeModel, input, max_output_tokens: maxTokens };
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  const corsOk = applyCors(req, res);

  if (!corsOk) {
    writeJson(req, res, 403, { error: "Origin not allowed" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    writeJson(req, res, 200, {
      ok: true,
      service: "sapa-ai-backend",
      openaiConfigured: Boolean(OPENAI_API_KEY),
      firebaseConfigured: Boolean(FIREBASE_WEB_API_KEY),
      model: OPENAI_MODEL,
      allowedOrigins: ALLOWED_ORIGINS.has("*") ? ["*"] : Array.from(ALLOWED_ORIGINS),
    });
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/sapa-ai") {
    writeJson(req, res, 404, { error: "Not found" });
    return;
  }

  if (!OPENAI_API_KEY) {
    writeJson(req, res, 500, { error: "Server missing OPENAI_API_KEY" });
    return;
  }

  const auth = await verifyFirebaseUser(req);
  if (!auth.ok) {
    writeJson(req, res, auth.status, { error: auth.error });
    return;
  }

  const rateKey = `${auth.uid}|${clientIp(req)}`;
  const blocked = applyRateLimit(res, rateKey);
  if (blocked) {
    writeJson(req, res, 429, { error: "Too many requests. Try again shortly." });
    return;
  }

  try {
    const raw = await readBody(req);
    const incoming = raw ? JSON.parse(raw) : {};
    const safeReq = normalizeIncomingRequest(incoming);
    if (!safeReq.input.length) {
      writeJson(req, res, 400, { error: "Request input is required" });
      return;
    }
    if (safeReq.input.length > 40) {
      writeJson(req, res, 400, { error: "Request input is too long" });
      return;
    }

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 30_000);

    const upstream = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(safeReq),
      signal: abort.signal,
    }).finally(() => clearTimeout(timeout));

    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(text);
  } catch (err) {
    if (err?.name === "AbortError") {
      writeJson(req, res, 504, { error: "AI backend timed out" });
      return;
    }
    writeJson(req, res, 500, { error: err?.message || "Backend request failed" });
  }
});

server.listen(PORT, () => {
  console.log(`SAPA AI backend listening on http://localhost:${PORT}`);
});
