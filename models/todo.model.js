const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const TODOS_FILE = path.join(DATA_DIR, "todos.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(TODOS_FILE)) {
    fs.writeFileSync(TODOS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function readTodos() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(TODOS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTodos(todos) {
  ensureStorage();
  fs.writeFileSync(TODOS_FILE, JSON.stringify(todos, null, 2), "utf8");
}

const TodoModel = {
  findAll(filters = {}) {
    let todos = readTodos();

    // Filter by userId if provided
    if (filters.userId !== undefined && filters.userId !== null) {
      todos = todos.filter((t) => t.userId === filters.userId);
    }

    // Filter by completed status (true/false)
    if (filters.completed !== undefined) {
      const isCompleted =
        filters.completed === true ||
        filters.completed === "true" ||
        filters.completed === "1";
      todos = todos.filter((t) => t.completed === isCompleted);
    }

    // Filter by priority ('low', 'medium', 'high')
    if (filters.priority) {
      todos = todos.filter(
        (t) => t.priority.toLowerCase() === String(filters.priority).toLowerCase()
      );
    }

    // Keyword search in title or description
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      todos = todos.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sortBy = filters.sortBy || "createdAt";
    const sortOrder = String(filters.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;

    todos.sort((a, b) => {
      const valA = a[sortBy] ?? "";
      const valB = b[sortBy] ?? "";
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return todos;
  },

  findById(id) {
    const todos = readTodos();
    return todos.find((t) => t.id === id) || null;
  },

  create({ title, description = "", priority = "medium", dueDate = null, completed = false, userId = null }) {
    if (!title || typeof title !== "string" || !title.trim()) {
      throw new Error("Title is required");
    }

    const validPriorities = ["low", "medium", "high"];
    const normalizedPriority = validPriorities.includes(String(priority).toLowerCase())
      ? String(priority).toLowerCase()
      : "medium";

    const todos = readTodos();
    const newTodo = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      priority: normalizedPriority,
      completed: Boolean(completed),
      dueDate: dueDate || null,
      userId: userId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    todos.unshift(newTodo);
    writeTodos(todos);

    return newTodo;
  },

  update(id, updates = {}) {
    const todos = readTodos();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const existing = todos[index];

    // Validate title if updated
    if (updates.title !== undefined) {
      if (typeof updates.title !== "string" || !updates.title.trim()) {
        throw new Error("Title cannot be empty");
      }
      existing.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      existing.description =
        typeof updates.description === "string" ? updates.description.trim() : "";
    }

    if (updates.completed !== undefined) {
      existing.completed = Boolean(updates.completed);
    }

    if (updates.priority !== undefined) {
      const validPriorities = ["low", "medium", "high"];
      if (validPriorities.includes(String(updates.priority).toLowerCase())) {
        existing.priority = String(updates.priority).toLowerCase();
      }
    }

    if (updates.dueDate !== undefined) {
      existing.dueDate = updates.dueDate || null;
    }

    existing.updatedAt = new Date().toISOString();

    todos[index] = existing;
    writeTodos(todos);

    return existing;
  },

  toggle(id) {
    const todos = readTodos();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    todos[index].completed = !todos[index].completed;
    todos[index].updatedAt = new Date().toISOString();

    writeTodos(todos);
    return todos[index];
  },

  delete(id) {
    const todos = readTodos();
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const [deleted] = todos.splice(index, 1);
    writeTodos(todos);
    return deleted;
  },

  // Helper for tests/resets
  clearAll() {
    writeTodos([]);
  },
};

module.exports = TodoModel;
