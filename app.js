const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");

// Load .env environment variables if present
try {
  process.loadEnvFile();
} catch {}

// Import routes and middlewares
const authRouter = require("./router/auth.route");
const todosRouter = require("./router/todos.route");
const { requestLogger } = require("./middleware/logger.middleware");
const { auditLogger } = require("./middleware/auditLogger");
const { notFoundHandler, errorHandler } = require("./middleware/error.middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================
// 1. Middlewares
// ==============================
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "todo_session_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 2 * 60 * 60 * 1000 }, // 2 hours
  })
);
app.use(auditLogger);

// Serve frontend static assets from public/
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// ==============================
// 2. Root & Health Check Routes
// ==============================
app.get("/", (req, res) => {
  // If request is from a browser asking for HTML, serve the frontend SPA
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    return res.sendFile(path.join(__dirname, "public", "index.html"));
  }

  // Otherwise return API information JSON
  res.json({
    name: "To-Do Manager API",
    status: "running",
    endpoints: {
      auth: "/api/auth",
      todos: "/api/todos",
    },
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ==============================
// 3. API Routes
// ==============================
app.use("/api/auth", authRouter);
app.use("/api/todos", todosRouter);

// Root path aliases for convenient access
app.use("/auth", authRouter);
app.use("/todos", todosRouter);
app.use("/", authRouter);

// ==============================
// 4. Error Handling
// ==============================
app.use(notFoundHandler);
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
