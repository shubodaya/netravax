// Netravax admin API: session-based auth (PBKDF2 + HttpOnly session cookie +
// CSRF cookie) backing a single-owner content editor, mirroring the proven
// pattern from portfolio-net (network.shubodaya.dev)'s _worker.js -- same
// crypto primitives, same cookie/CSRF/lockout model, same "write to D1
// immediately, sync to GitHub in the background" flow. Adapted to Cloudflare
// Pages Functions' per-route file convention instead of a single Advanced
// Mode _worker.js, since netravax-site is a plain static multi-page site
// that only needs a Function for /api/*, not custom asset routing.

const SESSION_COOKIE_NAME = "admin_session";
const CSRF_COOKIE_NAME = "admin_csrf";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const PASSWORD_HASH_ITERATIONS = 100000;
const MAX_JSON_BODY_CHARS = 300000;
const MAX_SITE_CONTENT_CHARS = 260000;
const CLEANUP_SAMPLE_RATE = 0.05;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOKIE_FLAGS = "Path=/; HttpOnly; Secure; SameSite=Strict";
const CSRF_COOKIE_FLAGS = "Path=/; Secure; SameSite=Strict";
const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_API_TIMEOUT_MS = 12000;
const DEFAULT_GITHUB_REPO_OWNER = "shubodaya";
const DEFAULT_GITHUB_REPO_NAME = "netravax";
const DEFAULT_GITHUB_REPO_BRANCH = "main";
const DEFAULT_GITHUB_CONTENT_FILE_PATH = "src/content/site-content.json";
const CONTENT_KEY = "netravax";

const textEncoder = new TextEncoder();

export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  try {
    const configError = assertServerConfig(env);
    if (configError) return configError;

    const url = new URL(request.url);
    const { pathname } = url;

    if (Math.random() < CLEANUP_SAMPLE_RATE) {
      waitUntil(cleanupState(env).catch(() => {}));
    }

    if (pathname === "/api/health" && request.method === "GET") {
      return jsonSuccess({ ok: true, timestamp: new Date().toISOString() });
    }
    if (pathname === "/api/site-content" && request.method === "GET") {
      const content = await getSiteContent(env.DB);
      return jsonSuccess(content);
    }
    if (pathname === "/api/admin/setup-status" && request.method === "GET") {
      const owner = await getOwner(env.DB);
      return jsonSuccess({ setupRequired: !owner, ownerConfigured: Boolean(owner) });
    }
    if (pathname === "/api/admin/register-first" && request.method === "POST") {
      return handleRegisterFirstOwner(request, env);
    }
    if (pathname === "/api/admin/login" && request.method === "POST") {
      return handleOwnerLogin(request, env);
    }
    if (pathname === "/api/admin/logout" && request.method === "POST") {
      return handleOwnerLogout(request, env);
    }
    if (pathname === "/api/admin/me" && request.method === "GET") {
      return handleOwnerMe(request, env);
    }
    if (pathname === "/api/admin/content" && request.method === "GET") {
      const auth = await requireSession(request, env);
      if (!auth.ok) return auth.response;
      return jsonSuccess(await getSiteContent(env.DB));
    }
    if (pathname === "/api/admin/content" && request.method === "PUT") {
      return handleUpdateAdminContent(request, env, waitUntil);
    }

    return jsonError(404, "not_found", "Resource not found.");
  } catch (error) {
    return jsonError(500, "server_error", "Unexpected server error.", error instanceof Error ? error.message : "Unknown error");
  }
}

function assertServerConfig(env) {
  if (!env.DB) {
    return jsonError(500, "not_configured", "Database binding is missing.");
  }
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    return jsonError(500, "not_configured", "SESSION_SECRET is missing or too short.");
  }
  return null;
}

async function handleRegisterFirstOwner(request, env) {
  if (!isExpectedOrigin(request)) return jsonError(403, "origin_mismatch", "Invalid request origin.");

  const body = await readJsonBody(request);
  if (body.errorResponse) return body.errorResponse;

  const owner = await getOwner(env.DB);
  if (owner) return jsonError(403, "owner_exists", "Owner account already exists.");

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!EMAIL_REGEX.test(email) || email.length > 254) {
    return jsonError(400, "invalid_email", "Enter a valid email address.");
  }
  const passwordErrors = validatePasswordComplexity(password, email);
  if (passwordErrors.length > 0) {
    return jsonError(400, "weak_password", passwordErrors[0], { issues: passwordErrors });
  }
  if (password !== confirmPassword) {
    return jsonError(400, "password_mismatch", "Password confirmation does not match.");
  }

  const salt = randomToken(16);
  const passwordHash = await hashPassword(password, salt, PASSWORD_HASH_ITERATIONS);
  const nowIso = new Date().toISOString();

  try {
    const insertResult = await env.DB.prepare(
      `INSERT INTO users (singleton, email, password_hash, salt, iterations, created_at, updated_at)
       VALUES (1, ?1, ?2, ?3, ?4, ?5, ?5)`
    )
      .bind(email, passwordHash, salt, PASSWORD_HASH_ITERATIONS, nowIso)
      .run();

    const userId = Number(insertResult.meta?.last_row_id || 0);
    if (!userId) return jsonError(500, "create_failed", "Failed to create owner account.");

    return issueSessionResponse({
      env,
      userId,
      email,
      request,
      status: 201,
      payload: { message: "Owner account created. Account creation is now disabled.", authenticated: true, email }
    });
  } catch (error) {
    if (String(error?.message || "").includes("UNIQUE constraint failed")) {
      return jsonError(403, "owner_exists", "Owner account already exists.");
    }
    return jsonError(500, "create_failed", "Failed to create owner account.");
  }
}

async function handleOwnerLogin(request, env) {
  if (!isExpectedOrigin(request)) return jsonError(403, "origin_mismatch", "Invalid request origin.");

  const body = await readJsonBody(request);
  if (body.errorResponse) return body.errorResponse;

  const lockKey = buildLoginLockKey(request);
  const lockStatus = await getLoginLock(env.DB, lockKey);
  if (lockStatus.lockedUntil && lockStatus.lockedUntil > Date.now()) {
    return jsonError(429, "too_many_attempts", "Too many failed login attempts.", {
      lockedUntil: new Date(lockStatus.lockedUntil).toISOString()
    });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!EMAIL_REGEX.test(email)) {
    await recordLoginFailure(env.DB, lockKey);
    return jsonError(400, "invalid_credentials", "Invalid email or password.");
  }

  const owner = await getOwner(env.DB);
  if (!owner || owner.email !== email) {
    await recordLoginFailure(env.DB, lockKey);
    return jsonError(401, "invalid_credentials", "Invalid email or password.");
  }

  const verified = await verifyPassword({
    password,
    salt: owner.salt,
    iterations: owner.iterations,
    expectedHash: owner.passwordHash
  });

  if (!verified) {
    const failureStatus = await recordLoginFailure(env.DB, lockKey);
    if (failureStatus.lockedUntil && failureStatus.lockedUntil > Date.now()) {
      return jsonError(429, "too_many_attempts", "Too many failed login attempts.", {
        lockedUntil: new Date(failureStatus.lockedUntil).toISOString()
      });
    }
    return jsonError(401, "invalid_credentials", "Invalid email or password.");
  }

  await clearLoginLock(env.DB, lockKey);

  return issueSessionResponse({
    env,
    userId: owner.id,
    email: owner.email,
    request,
    status: 200,
    payload: { message: "Login successful.", authenticated: true, email: owner.email }
  });
}

async function handleOwnerLogout(request, env) {
  if (!isExpectedOrigin(request)) return jsonError(403, "origin_mismatch", "Invalid request origin.");

  const auth = await requireSession(request, env);
  if (auth.ok) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(auth.session.sessionId).run();
  }

  const headers = new Headers();
  clearSessionCookies(headers);
  return jsonSuccess({ message: "Logged out.", authenticated: false }, { status: 200, headers });
}

async function handleOwnerMe(request, env) {
  const setup = await getOwner(env.DB);
  const auth = await requireSession(request, env);
  if (!auth.ok) {
    return jsonSuccess({ setupRequired: !setup, authenticated: false });
  }
  return jsonSuccess({
    setupRequired: !setup,
    authenticated: true,
    email: auth.session.email,
    csrfToken: auth.session.csrfToken
  });
}

async function handleUpdateAdminContent(request, env, waitUntil) {
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;

  const csrfError = validateCsrf(request, auth.session.csrfToken);
  if (csrfError) return csrfError;

  const body = await readJsonBody(request);
  if (body.errorResponse) return body.errorResponse;

  const nextContent = sanitizeSiteContent(body.content ?? body);
  if (!nextContent || typeof nextContent !== "object" || Array.isArray(nextContent)) {
    return jsonError(400, "invalid_body", "Content must be a JSON object.");
  }

  let serializedContent = "";
  try {
    serializedContent = JSON.stringify(nextContent);
  } catch {
    return jsonError(400, "invalid_body", "Content must be JSON-serializable.");
  }
  if (serializedContent.length > MAX_SITE_CONTENT_CHARS) {
    return jsonError(413, "payload_too_large", "Site content payload is too large.");
  }

  const nowIso = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO site_content (content_key, content_json, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(content_key) DO UPDATE SET content_json = excluded.content_json, updated_at = excluded.updated_at`
  )
    .bind(CONTENT_KEY, serializedContent, nowIso)
    .run();

  queueBackgroundTask(waitUntil, "github-sync", () => syncSiteContentToGitHub(env, nextContent));

  return jsonSuccess({ message: "Content updated.", content: nextContent, updatedAt: nowIso, configured: true });
}

async function issueSessionResponse({ env, userId, email, request, payload, status }) {
  const sessionToken = randomToken(32);
  const sessionHash = await hashSessionToken(sessionToken, env.SESSION_SECRET);
  const csrfToken = randomToken(24);
  const now = Date.now();
  const expiresAt = new Date(now + SESSION_TTL_SECONDS * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  await env.DB.prepare(
    `INSERT INTO sessions (user_id, session_token_hash, csrf_token, ip_address, user_agent, expires_at, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  )
    .bind(userId, sessionHash, csrfToken, getClientIp(request), String(request.headers.get("User-Agent") || "").slice(0, 255), expiresAt, nowIso)
    .run();

  const headers = new Headers();
  headers.append("Set-Cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${COOKIE_FLAGS}; Max-Age=${SESSION_TTL_SECONDS}`);
  headers.append("Set-Cookie", `${CSRF_COOKIE_NAME}=${csrfToken}; ${CSRF_COOKIE_FLAGS}; Max-Age=${SESSION_TTL_SECONDS}`);

  return jsonSuccess({ ...payload, csrfToken }, { status, headers });
}

async function requireSession(request, env) {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionToken = cookies[SESSION_COOKIE_NAME];
  if (!sessionToken) {
    return { ok: false, response: jsonError(401, "unauthorized", "Login required.") };
  }

  const sessionHash = await hashSessionToken(sessionToken, env.SESSION_SECRET);
  const sessionRow = await env.DB.prepare(
    `SELECT sessions.id AS session_id, sessions.csrf_token AS csrf_token, sessions.expires_at AS expires_at,
            users.id AS user_id, users.email AS email
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.session_token_hash = ?1 LIMIT 1`
  )
    .bind(sessionHash)
    .first();

  if (!sessionRow) {
    return { ok: false, response: jsonError(401, "unauthorized", "Login required.") };
  }
  if (Date.parse(sessionRow.expires_at) <= Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(sessionRow.session_id).run();
    return { ok: false, response: jsonError(401, "session_expired", "Session expired.") };
  }

  return {
    ok: true,
    session: {
      sessionId: Number(sessionRow.session_id),
      csrfToken: String(sessionRow.csrf_token || ""),
      userId: Number(sessionRow.user_id),
      email: String(sessionRow.email || "")
    }
  };
}

function validateCsrf(request, expectedToken) {
  if (!isExpectedOrigin(request)) return jsonError(403, "origin_mismatch", "Invalid request origin.");
  const requestToken = String(request.headers.get("x-csrf-token") || "").trim();
  if (!requestToken || requestToken !== expectedToken) {
    return jsonError(403, "invalid_csrf", "Invalid CSRF token.");
  }
  return null;
}

function isExpectedOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const requestOrigin = new URL(request.url).origin;
  return origin === requestOrigin;
}

function clearSessionCookies(headers) {
  headers.append("Set-Cookie", `${SESSION_COOKIE_NAME}=; ${COOKIE_FLAGS}; Max-Age=0`);
  headers.append("Set-Cookie", `${CSRF_COOKIE_NAME}=; ${CSRF_COOKIE_FLAGS}; Max-Age=0`);
}

async function getOwner(db) {
  const owner = await db.prepare("SELECT id, email, password_hash, salt, iterations FROM users LIMIT 1").first();
  if (!owner) return null;
  return {
    id: Number(owner.id),
    email: String(owner.email || ""),
    passwordHash: String(owner.password_hash || ""),
    salt: String(owner.salt || ""),
    iterations: Number(owner.iterations || PASSWORD_HASH_ITERATIONS)
  };
}

async function getSiteContent(db) {
  const row = await db.prepare("SELECT content_json, updated_at FROM site_content WHERE content_key = ?1 LIMIT 1").bind(CONTENT_KEY).first();
  if (!row) return { configured: false, content: { categories: [] }, updatedAt: "" };

  let content = { categories: [] };
  try {
    const parsed = JSON.parse(String(row.content_json || "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) content = parsed;
  } catch {
    content = { categories: [] };
  }

  return { configured: true, content: sanitizeSiteContent(content), updatedAt: String(row.updated_at || "") };
}

function sanitizeSiteContent(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeSiteContent(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeSiteContent(item)]));
  }
  return value;
}

function buildLoginLockKey(request) {
  return `login:${getClientIp(request)}`;
}

async function getLoginLock(db, key) {
  const row = await db.prepare("SELECT failures, locked_until FROM login_attempts WHERE key = ?1").bind(key).first();
  if (!row) return { failures: 0, lockedUntil: 0 };
  return { failures: Number(row.failures || 0), lockedUntil: row.locked_until ? Date.parse(String(row.locked_until)) : 0 };
}

async function recordLoginFailure(db, key) {
  const now = Date.now();
  const current = await getLoginLock(db, key);
  const nextFailures = current.failures + 1;
  let nextLockedUntil = 0;
  let storedFailures = nextFailures;

  if (nextFailures >= MAX_FAILED_LOGINS) {
    nextLockedUntil = now + LOCKOUT_DURATION_MS;
    storedFailures = 0;
  }

  await db.prepare(
    `INSERT INTO login_attempts (key, failures, locked_until, updated_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(key) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until, updated_at = excluded.updated_at`
  )
    .bind(key, storedFailures, nextLockedUntil ? new Date(nextLockedUntil).toISOString() : null, new Date(now).toISOString())
    .run();

  return { failures: storedFailures, lockedUntil: nextLockedUntil };
}

async function clearLoginLock(db, key) {
  await db.prepare("DELETE FROM login_attempts WHERE key = ?1").bind(key).run();
}

async function cleanupState(env) {
  if (!env?.DB) return;
  const nowIso = new Date().toISOString();
  const staleLockIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= ?1").bind(nowIso).run();
  await env.DB.prepare("DELETE FROM login_attempts WHERE updated_at <= ?1").bind(staleLockIso).run();
}

function validatePasswordComplexity(password, email = "") {
  const errors = [];
  const normalized = String(password || "");
  if (normalized.length < 12) errors.push("Password must be at least 12 characters.");
  if (!/[A-Z]/.test(normalized)) errors.push("Password must include an uppercase letter.");
  if (!/[a-z]/.test(normalized)) errors.push("Password must include a lowercase letter.");
  if (!/\d/.test(normalized)) errors.push("Password must include a number.");
  if (!/[^A-Za-z0-9]/.test(normalized)) errors.push("Password must include a symbol.");
  if (/\s/.test(normalized)) errors.push("Password cannot contain spaces.");
  const localPart = String(email || "").trim().toLowerCase().split("@")[0];
  if (localPart && normalized.toLowerCase().includes(localPart)) {
    errors.push("Password should not include your email username.");
  }
  return errors;
}

async function hashPassword(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: textEncoder.encode(salt), iterations },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(derivedBits));
}

async function verifyPassword({ password, salt, iterations, expectedHash }) {
  const computedHash = await hashPassword(password, salt, iterations);
  return timingSafeEqual(computedHash, expectedHash);
}

async function hashSessionToken(token, secret) {
  const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(token));
  return bytesToHex(new Uint8Array(signature));
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.split("=");
    const key = rawKey ? rawKey.trim() : "";
    if (!key) continue;
    cookies[key] = decodeURIComponent(rawValue.join("=").trim());
  }
  return cookies;
}

function getClientIp(request) {
  const direct = request.headers.get("CF-Connecting-IP");
  if (direct) return direct;
  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

async function readJsonBody(request) {
  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return { errorResponse: jsonError(415, "invalid_content_type", "Request must be JSON.") };
  }
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_JSON_BODY_CHARS) {
      return { errorResponse: jsonError(413, "payload_too_large", "JSON body is too large.") };
    }
    const body = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { errorResponse: jsonError(400, "invalid_body", "JSON body must be an object.") };
    }
    return body;
  } catch {
    return { errorResponse: jsonError(400, "invalid_json", "Malformed JSON payload.") };
  }
}

function jsonSuccess(data, options = {}) {
  return jsonResponse(data, options.status || 200, options.headers);
}

function jsonError(status, code, message, details = null) {
  return jsonResponse({ error: { code, message, details } }, status);
}

function jsonResponse(data, status, headers) {
  const responseHeaders = new Headers(headers || {});
  if (!responseHeaders.has("Content-Type")) responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { status, headers: responseHeaders });
}

function randomToken(bytes) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  const valueA = String(a || "");
  const valueB = String(b || "");
  if (valueA.length !== valueB.length) return false;
  let result = 0;
  for (let index = 0; index < valueA.length; index += 1) {
    result |= valueA.charCodeAt(index) ^ valueB.charCodeAt(index);
  }
  return result === 0;
}

function queueBackgroundTask(waitUntil, label, task) {
  if (!waitUntil) return;
  waitUntil(
    Promise.resolve()
      .then(task)
      .catch((error) => {
        console.error(`[${label}]`, error);
      })
  );
}

function resolveGitHubSyncConfig(env) {
  const syncEnabled = String(env?.GITHUB_SYNC_ENABLED || "false").trim().toLowerCase() === "true";
  if (!syncEnabled) return null;

  const token = String(env?.GITHUB_SYNC_TOKEN || "").trim();
  const owner = String(env?.GITHUB_REPO_OWNER || DEFAULT_GITHUB_REPO_OWNER).trim();
  const repo = String(env?.GITHUB_REPO_NAME || DEFAULT_GITHUB_REPO_NAME).trim();
  const branch = String(env?.GITHUB_REPO_BRANCH || DEFAULT_GITHUB_REPO_BRANCH).trim();
  const filePath = String(env?.GITHUB_CONTENT_FILE_PATH || DEFAULT_GITHUB_CONTENT_FILE_PATH).trim();

  if (!token || !owner || !repo || !branch || !filePath) return null;
  return { token, owner, repo, branch, filePath };
}

function encodeGitHubPath(path) {
  return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function utf8ToBase64(value) {
  const bytes = textEncoder.encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function githubApiRequest({ config, method, apiPath, payload, allowNotFound = false }) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${config.token}`,
    "User-Agent": "netravax-content-sync"
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_API_TIMEOUT_MS);
  try {
    const response = await fetch(`${GITHUB_API_BASE_URL}${apiPath}`, {
      method,
      headers,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal
    });
    const text = await response.text();
    const data = text ? safeJsonParse(text) : null;
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`GitHub API ${method} ${apiPath} failed with ${response.status}: ${data?.message || response.statusText || "Unknown error"}`);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function syncSiteContentToGitHub(env, content) {
  const config = resolveGitHubSyncConfig(env);
  if (!config) return;

  const encodedPath = encodeGitHubPath(config.filePath);
  const apiPath = `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`;
  const existing = await githubApiRequest({ config, method: "GET", apiPath, allowNotFound: true });

  const serialized = `${JSON.stringify(content, null, 2)}\n`;
  await githubApiRequest({
    config,
    method: "PUT",
    apiPath: `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`,
    payload: {
      message: "sync(content): update site content",
      content: utf8ToBase64(serialized),
      branch: config.branch,
      ...(existing?.sha ? { sha: String(existing.sha) } : {})
    }
  });
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
