const express = require("express");
const path = require("path");

// Load environment variables from .env if present
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {
  // If .env is missing, fallback to existing process.env
}

const authRouter = require("./router/auth.route");
const todosRouter = require("./router/todos.route");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const { requestLogger } = require("./middleware/logger.middleware");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();

const configuredPort = process.env.PORT === undefined ? 8000 : Number(process.env.PORT);
if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

// Built-in & Custom Middlewares
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "todo_session_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Root Information Endpoint
app.get("/", (req, res) => {
  res.json({
    name: "To-Do Manager API",
    status: "running",
    version: "1.0.0",
    health: "/health",
    endpoints: {
      auth: {
        register: "POST /api/auth/register (or /register)",
        login: "POST /api/auth/login (or /login)",
        logout: "POST /api/auth/logout (or /logout)",
        profile: "GET /api/auth/me (Bearer token or Cookie session)",
      },
      todos: {
        list: "GET /api/todos (supports ?completed=true&priority=high&search=keyword)",
        getById: "GET /api/todos/:id",
        create: "POST /api/todos",
        update: "PUT /api/todos/:id or PATCH /api/todos/:id",
        toggle: "PATCH /api/todos/:id/toggle",
        delete: "DELETE /api/todos/:id",
      },
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/todos", todosRouter);

// Convenient root aliases (backward-compatible)
app.use("/auth", authRouter);
app.use("/todos", todosRouter);
app.use("/", authRouter);

// 404 Handler for unknown routes
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
  app.listen(configuredPort, () => {
    console.log(`To-Do Manager API listening on port ${configuredPort}`);
  });
}

module.exports = app;
