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
});
