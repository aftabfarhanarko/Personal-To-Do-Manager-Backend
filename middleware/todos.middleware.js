const TodoModel = require("../models/todo.model");

// 1. Validate route middleware
// Passes control with next() if valid; returns 404 Not Found if route does not exist
function checkTodoRoute(req, res, next) {
  const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

  if (!validMethods.includes(req.method)) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }

  // Check sub-paths: "/" or "/:id" or "/:id/toggle"
  const segments = req.path.split("/").filter(Boolean);

  const isValid =
    segments.length === 0 || // "/" (GET, POST)
    segments.length === 1 || // "/:id" (GET, PUT, PATCH, DELETE)
    (segments.length === 2 && segments[1] === "toggle"); // "/:id/toggle" (PATCH)

  if (!isValid) {
    return res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }

  next(); // Route is valid, proceed to next handler
}

// 2. Validate that the Todo item exists in storage
function checkTodoExists(req, res, next) {
  const todo = TodoModel.findById(req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: `Todo with ID '${req.params.id}' not found`,
    });
  }

  req.todo = todo;
  next();
}

// 3. Validate required title when creating a Todo
function validateTodo(req, res, next) {
  const { title } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Title is required",
    });
  }

  next();
}

module.exports = {
  checkTodoRoute,
  checkTodoExists,
  validateTodo,
};
