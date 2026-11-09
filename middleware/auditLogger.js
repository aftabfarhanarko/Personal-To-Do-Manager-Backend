const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { verifyToken, getTokenFromCookie } = require("../utils/auth.utils");

const LOGS_DIR = path.join(__dirname, "..", "logs");
const DATA_DIR = path.join(__dirname, "..", "data");
const AUDIT_LOG_FILE = path.join(LOGS_DIR, "audit-logs.json");
const BLOCKED_USERS_FILE = path.join(DATA_DIR, "blocked-users.json");

// ==========================================
// File Storage Helpers
// ==========================================

function ensureStorage() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify([], null, 2), "utf8");
  }
  if (!fs.existsSync(BLOCKED_USERS_FILE)) {
    fs.writeFileSync(BLOCKED_USERS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function readAuditLogs() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(AUDIT_LOG_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAuditLogs(logs) {
  ensureStorage();
  try {
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch {}
}

function readBlockedUsers() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(BLOCKED_USERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeBlockedUsers(list) {
  ensureStorage();
  try {
    fs.writeFileSync(BLOCKED_USERS_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch {}
}

// Append new audit log (capped at 1000 records to prevent infinite growth)
function appendAuditLog(entry) {
  try {
    const logs = readAuditLogs();
    logs.push(entry);
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    writeAuditLogs(logs);
  } catch {}
}

// ==========================================
// Block User Management API
// ==========================================

function blockUser(identifier, reason = "Blocked by security policy") {
  if (!identifier) return false;
  const list = readBlockedUsers();
  const normalized = String(identifier).trim().toLowerCase();

  const exists = list.some((item) => {
    const id = typeof item === "string" ? item : item.identifier;
    return id.toLowerCase() === normalized;
  });

  if (!exists) {
    list.push({
      identifier: normalized,
      reason,
      blockedAt: new Date().toISOString(),
    });
    writeBlockedUsers(list);
  }
  return true;
}

function unblockUser(identifier) {
  if (!identifier) return false;
  const list = readBlockedUsers();
  const normalized = String(identifier).trim().toLowerCase();
  const filtered = list.filter((item) => {
    const id = typeof item === "string" ? item : item.identifier;
    return id.toLowerCase() !== normalized;
  });
  writeBlockedUsers(filtered);
  return filtered.length !== list.length;
}

function isBlocked(identifier) {
  if (!identifier) return false;
  const list = readBlockedUsers();
  const normalized = String(identifier).trim().toLowerCase();
  return list.some((item) => {
    const id = typeof item === "string" ? item : item.identifier;
    return id.toLowerCase() === normalized;
  });
}

function getBlockedUsers() {
  return readBlockedUsers();
}

function getAuditLogs() {
  return readAuditLogs();
}

function clearAuditLogs() {
  writeAuditLogs([]);
}

// ==========================================
// Request Helpers
// ==========================================

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1"
  );
}

function extractUser(req) {
  // 1. From req.user (if already authenticated)
  if (req.user) {
    return { id: req.user.id, email: req.user.email };
  }

  // 2. From express-session
  if (req.session?.user) {
    return { id: req.session.user.id, email: req.session.user.email };
  }
  if (req.session?.userId) {
    return { id: req.session.userId, email: null };
  }

  // 3. From JWT in Bearer header or cookie
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || req.cookies?.token || getTokenFromCookie(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.id) {
      return { id: decoded.id, email: decoded.email || null };
    }
  }

  // 4. From request body if logging in or registering
  if (req.body?.email && typeof req.body.email === "string") {
    return { id: null, email: req.body.email.trim().toLowerCase() };
  }

  return null;
}

// Check if request is associated with a blocked user or IP
function checkRequestBlocked(req, user, ip) {
  if (isBlocked(ip)) return { blocked: true, target: ip, type: "IP" };
  if (user?.id && isBlocked(user.id)) return { blocked: true, target: user.id, type: "USER_ID" };
  if (user?.email && isBlocked(user.email)) return { blocked: true, target: user.email, type: "EMAIL" };
  return { blocked: false };
}

// Sanitize request body to remove sensitive fields from logs
function sanitizeBody(body) {
  if (!body || typeof body !== "object") return null;
  const { password, confirmPassword, token, ...safe } = body;
  return Object.keys(safe).length > 0 ? safe : null;
}

// ==========================================
// Audit Logger Middleware
// ==========================================

function auditLogger(req, res, next) {
  const startTime = Date.now();
  const ip = getClientIp(req);
  const user = extractUser(req);

  // 1. Check if user, email, or IP is blocked
  const blockCheck = checkRequestBlocked(req, user, ip);
  if (blockCheck.blocked) {
    const blockedLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      ip,
      user,
      statusCode: 403,
      status: "BLOCKED",
      reason: `Blocked target: ${blockCheck.type} (${blockCheck.target})`,
      userAgent: req.headers["user-agent"] || "unknown",
      durationMs: Date.now() - startTime,
    };
    appendAuditLog(blockedLog);

    return res.status(403).json({
      success: false,
      message: "Access Denied: Your account or IP address has been blocked.",
      reason: blockedLog.reason,
    });
  }

  // 2. Intercept response finish event to record structured log
  res.on("finish", () => {
    // Re-check user in case request was authenticated during middleware chain
    const finalUser = user || extractUser(req);
    const durationMs = Date.now() - startTime;

    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      ip,
      user: finalUser,
      body: sanitizeBody(req.body),
      query: Object.keys(req.query || {}).length > 0 ? req.query : undefined,
      statusCode: res.statusCode,
      durationMs,
      status:
        res.statusCode >= 500
          ? "SERVER_ERROR"
          : res.statusCode >= 400
          ? "CLIENT_ERROR"
          : "SUCCESS",
      userAgent: req.headers["user-agent"] || "unknown",
    };

    appendAuditLog(auditEntry);
  });

  next();
}

module.exports = {
  auditLogger,
  blockUser,
  unblockUser,
  isBlocked,
  getBlockedUsers,
  getAuditLogs,
  clearAuditLogs,
};
