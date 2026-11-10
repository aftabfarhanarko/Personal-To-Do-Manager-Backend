const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LOGS_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOGS_DIR, "request-logs.json");

// Ensure logs directory and JSON file exist
function ensureLogFile() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

// Read all request logs from JSON file
function getRequestLogs() {
  ensureLogFile();
  try {
    const content = fs.readFileSync(LOG_FILE, "utf8");
    return JSON.parse(content) || [];
  } catch {
    return [];
  }
}

// Append a request log entry into the JSON file
function saveRequestLog(entry) {
  try {
    const logs = getRequestLogs();
    logs.push(entry);

    // Keep the latest 1000 requests to prevent file from growing indefinitely
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch (err) {
    // Fail silently so file I/O errors never crash the server
  }
}

// Clear all request logs (useful for testing or log rotation)
function clearRequestLogs() {
  ensureLogFile();
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), "utf8");
  } catch {}
}

// Simple request logger middleware
function requestLogger(req, res, next) {
  const startTime = Date.now();
  const time = new Date().toLocaleTimeString();

  // Silence console logs during automated test runs
  if (process.env.NODE_ENV !== "test") {
    console.log(`[${time}] ${req.method} ${req.originalUrl || req.url}`);
  }

  // Save request details to JSON file when response completes
  res.on("finish", () => {
    const logData = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      time,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
      ip:
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip ||
        "127.0.0.1",
      userAgent: req.headers["user-agent"] || "unknown",
    };

    saveRequestLog(logData);
  });

  next();
}

module.exports = {
  requestLogger,
  getRequestLogs,
  clearRequestLogs,
};
