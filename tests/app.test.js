const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../app");
const UserModel = require("../models/user.model");
const TodoModel = require("../models/todo.model");

// Helper to make requests against ephemeral test server
function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: options.path,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch {
            json = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test("To-Do Manager API Suite", async (t) => {
  let server;

  t.before(() => {
    // Clean test data before running tests
    UserModel.clearAll();
    TodoModel.clearAll();
    process.env.NODE_ENV = "test";

    return new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
  });

  t.after(() => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  await t.test("GET / - returns API information", async () => {
    const res = await makeRequest(server, { path: "/", method: "GET" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.name, "To-Do Manager API");
    assert.strictEqual(res.data.status, "running");
    assert.ok(res.data.endpoints);
  });

  await t.test("GET /health - returns health status", async () => {
    const res = await makeRequest(server, { path: "/health", method: "GET" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "ok");
    assert.ok(typeof res.data.uptime === "number");
  });

  await t.test("GET /non-existent - returns 404 JSON", async () => {
    const res = await makeRequest(server, { path: "/unknown-path", method: "GET" });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    assert.ok(res.data.message.includes("Route not found"));
  });

  let authToken = "";
  let userId = "";

  await t.test("POST /api/auth/register - fails with invalid input", async () => {
    const res = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "", email: "bad-email", password: "123" }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("POST /api/auth/register - successfully registers user", async () => {
    const res = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "John Doe", email: "john@example.com", password: "password123" }
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.token);
    assert.strictEqual(res.data.data.user.email, "john@example.com");
    assert.strictEqual(res.data.data.user.name, "John Doe");
    assert.strictEqual(res.data.data.user.password, undefined); // password must not be exposed

    authToken = res.data.data.token;
    userId = res.data.data.user.id;
  });

  await t.test("POST /api/auth/register - rejects duplicate email", async () => {
    const res = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "John Duplicate", email: "john@example.com", password: "password123" }
    );
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("POST /api/auth/login - fails with invalid credentials", async () => {
    const res = await makeRequest(
      server,
      { path: "/api/auth/login", method: "POST" },
      { email: "john@example.com", password: "wrongpassword" }
    );
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("POST /api/auth/login - succeeds with valid credentials", async () => {
    const res = await makeRequest(
      server,
      { path: "/api/auth/login", method: "POST" },
      { email: "john@example.com", password: "password123" }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.data.token);
  });

  await t.test("GET /api/auth/me - requires authorization header", async () => {
    const res = await makeRequest(server, { path: "/api/auth/me", method: "GET" });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("GET /api/auth/me - returns profile with valid Bearer token", async () => {
    const res = await makeRequest(server, {
      path: "/api/auth/me",
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.user.email, "john@example.com");
  });

  await t.test("GET /api/auth/me - authenticates successfully via Cookie header", async () => {
    const res = await makeRequest(server, {
      path: "/api/auth/me",
      method: "GET",
      headers: { Cookie: `token=${authToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.user.email, "john@example.com");
  });

  await t.test("express-session - authenticates via connect.sid session cookie", async () => {
    const loginRes = await makeRequest(
      server,
      { path: "/api/auth/login", method: "POST" },
      { email: "john@example.com", password: "password123" }
    );
    assert.strictEqual(loginRes.status, 200);
    const cookies = loginRes.headers["set-cookie"] || [];
    const sessionCookie = cookies.find((c) => c.startsWith("connect.sid="));
    assert.ok(sessionCookie);

    const sid = sessionCookie.split(";")[0];
    const meRes = await makeRequest(server, {
      path: "/api/auth/me",
      method: "GET",
      headers: { Cookie: sid },
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.data.success, true);
    assert.strictEqual(meRes.data.data.user.email, "john@example.com");
  });

  await t.test("POST /api/auth/logout - clears cookie session", async () => {
    const res = await makeRequest(server, {
      path: "/api/auth/logout",
      method: "POST",
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.message, "Logged out successfully");
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie);
  });

  let createdTodoId = "";

  await t.test("POST /api/todos - fails when title is missing", async () => {
    const res = await makeRequest(
      server,
      { path: "/api/todos", method: "POST" },
      { description: "Missing title" }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("POST /api/todos - creates a new todo", async () => {
    const res = await makeRequest(
      server,
      {
        path: "/api/todos",
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      },
      {
        title: "Learn Express & Node.js",
        description: "Study MVC pattern and RESTful API architecture",
        priority: "high",
        dueDate: "2026-12-01",
      }
    );
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.title, "Learn Express & Node.js");
    assert.strictEqual(res.data.data.priority, "high");
    assert.strictEqual(res.data.data.completed, false);
    assert.strictEqual(res.data.data.userId, userId);

    createdTodoId = res.data.data.id;
  });

  await t.test("GET /api/todos - returns list of todos", async () => {
    const res = await makeRequest(server, { path: "/api/todos", method: "GET" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.count, 1);
    assert.strictEqual(res.data.data[0].id, createdTodoId);
  });

  await t.test("GET /api/todos?search=Express - finds matching todo", async () => {
    const res = await makeRequest(server, { path: "/api/todos?search=Express", method: "GET" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.count, 1);
  });

  await t.test("GET /api/todos?priority=low - returns empty when no match", async () => {
    const res = await makeRequest(server, { path: "/api/todos?priority=low", method: "GET" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.count, 0);
  });

  await t.test("GET /api/todos/:id - returns todo by id", async () => {
    const res = await makeRequest(server, { path: `/api/todos/${createdTodoId}`, method: "GET" });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.id, createdTodoId);
  });

  await t.test("GET /api/todos/:id - returns 404 for non-existent id", async () => {
    const res = await makeRequest(server, { path: "/api/todos/non-existent-id", method: "GET" });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("GET /todos/invalid/sub/path - returns 404 from checkTodoRoute middleware", async () => {
    const res = await makeRequest(server, { path: "/todos/invalid/sub/path", method: "GET" });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("PATCH /api/todos/:id/toggle - toggles completed status", async () => {
    const res = await makeRequest(server, {
      path: `/api/todos/${createdTodoId}/toggle`,
      method: "PATCH",
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.completed, true);
  });

  await t.test("PUT /api/todos/:id - updates todo", async () => {
    const res = await makeRequest(
      server,
      { path: `/api/todos/${createdTodoId}`, method: "PUT" },
      { title: "Master Express & Node.js", priority: "medium" }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.strictEqual(res.data.data.title, "Master Express & Node.js");
    assert.strictEqual(res.data.data.priority, "medium");
  });

  await t.test("DELETE /api/todos/:id - deletes todo", async () => {
    const res = await makeRequest(server, {
      path: `/api/todos/${createdTodoId}`,
      method: "DELETE",
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);

    const getRes = await makeRequest(server, {
      path: `/api/todos/${createdTodoId}`,
      method: "GET",
    });
    assert.strictEqual(getRes.status, 404);
  });

  await t.test("auditLogger - writes structured JSON logs and blocks blocked users", async () => {
    const { blockUser, unblockUser, isBlocked, getAuditLogs } = require("../middleware/auditLogger");

    // 1. Verify structured logs recorded
    const logs = getAuditLogs();
    assert.ok(Array.isArray(logs));
    assert.ok(logs.length > 0);
    const sample = logs[0];
    assert.ok(sample.id);
    assert.ok(sample.timestamp);
    assert.ok(sample.method);
    assert.ok(sample.statusCode);

    // 2. Block a target identifier
    const blockedEmail = "spammer@example.com";
    blockUser(blockedEmail, "Violation of terms");
    assert.strictEqual(isBlocked(blockedEmail), true);

    // 3. Attempt request with blocked user -> 403 Forbidden
    const blockedRes = await makeRequest(
      server,
      { path: "/api/auth/login", method: "POST" },
      { email: blockedEmail, password: "password123" }
    );
    assert.strictEqual(blockedRes.status, 403);
    assert.strictEqual(blockedRes.data.success, false);
    assert.ok(blockedRes.data.message.includes("blocked"));

    // 4. Unblock target
    unblockUser(blockedEmail);
    assert.strictEqual(isBlocked(blockedEmail), false);
  });

  await t.test("GET /api/auth/activity - requires authentication", async () => {
    const res = await makeRequest(server, { path: "/api/auth/activity", method: "GET" });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  await t.test("GET /api/auth/activity - returns activity logs strictly for authenticated user with user-agent", async () => {
    const customUserAgent = "CustomTestBrowser/2.0 (To-Do Test Suite)";
    
    // Perform an authenticated action with custom User-Agent
    await makeRequest(server, {
      path: "/api/todos",
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "User-Agent": customUserAgent,
      },
    });

    // Small delay to ensure res.on("finish") write completes
    await new Promise((r) => setTimeout(r, 60));

    const res = await makeRequest(server, {
      path: "/api/auth/activity",
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "User-Agent": customUserAgent,
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
    assert.ok(res.data.data.length > 0);

    // Verify all returned logs strictly belong to this authenticated user
    for (const log of res.data.data) {
      assert.strictEqual(log.user.id, userId);
      assert.ok(log.userAgent);
    }

    // Verify the custom User-Agent is captured
    const matchingLog = res.data.data.find((l) => l.userAgent === customUserAgent);
    assert.ok(matchingLog);
    assert.strictEqual(matchingLog.userAgent, customUserAgent);
  });

  await t.test("getUserAuditLogs - isolates logs between users so users never see other users' logs", async () => {
    const { getUserAuditLogs } = require("../middleware/auditLogger");

    // Register second user
    const regRes = await makeRequest(
      server,
      { path: "/api/auth/register", method: "POST" },
      { name: "Second User", email: "second@example.com", password: "password123" }
    );
    assert.strictEqual(regRes.status, 201);
    const secondUserId = regRes.data.data.user.id;
    const secondToken = regRes.data.data.token;

    // Second user performs an action
    await makeRequest(server, {
      path: "/api/todos",
      method: "GET",
      headers: {
        Authorization: `Bearer ${secondToken}`,
        "User-Agent": "SecondUserAgent/1.0",
      },
    });

    await new Promise((r) => setTimeout(r, 60));

    const firstUserLogs = getUserAuditLogs(userId);
    const secondUserLogs = getUserAuditLogs(secondUserId);

    assert.ok(firstUserLogs.length > 0);
    assert.ok(secondUserLogs.length > 0);

    // Assert complete isolation: no crossover
    assert.ok(firstUserLogs.every((l) => l.user && l.user.id === userId));
    assert.ok(secondUserLogs.every((l) => l.user && l.user.id === secondUserId));

    // Calling with non-existent or invalid user ID returns empty array
    assert.deepStrictEqual(getUserAuditLogs("non-existent-user-id"), []);
    assert.deepStrictEqual(getUserAuditLogs(null), []);
  });

  await t.test("GET / with Accept: text/html - serves index.html with My Activity navigation", async () => {
    const res = await makeRequest(server, {
      path: "/",
      method: "GET",
      headers: { Accept: "text/html" },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.data === "string");
    assert.ok(res.data.includes("nav-activity"));
    assert.ok(res.data.includes("activity-view"));
    assert.ok(res.data.includes("My Activity"));
  });

  await t.test("GET /api/auth/user-agent-logs and /my-activity - serve user activity aliases", async () => {
    const res1 = await makeRequest(server, {
      path: "/api/auth/user-agent-logs",
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.data.success, true);

    const res2 = await makeRequest(server, {
      path: "/api/auth/my-activity",
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.success, true);
  });

  await t.test("requestLogger - records request data to logs/request-logs.json", async () => {
    const { getRequestLogs, clearRequestLogs } = require("../middleware/logger.middleware");
    clearRequestLogs();

    await makeRequest(server, { path: "/health", method: "GET" });
    await new Promise((r) => setTimeout(r, 60));

    const logs = getRequestLogs();
    assert.ok(Array.isArray(logs));
    assert.ok(logs.length > 0);
    const last = logs[logs.length - 1];
    assert.strictEqual(last.method, "GET");
    assert.strictEqual(last.url, "/health");
    assert.strictEqual(last.statusCode, 200);
    assert.ok(typeof last.durationMs === "number");
    assert.ok(last.timestamp);
    assert.ok(last.ip);
    assert.ok(last.userAgent);
  });
});
