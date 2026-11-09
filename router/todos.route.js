const express = require("express");
const router = express.Router();

const {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
} = require("../controllers/todos.controllers");
const { optionalAuth } = require("../middleware/auth.middleware");

// All routes support optional authentication (attaches user if token is provided)
router.use(optionalAuth);

// GET /todos - List all todos with search/filter/sort
router.get("/", getAllTodos);

// GET /todos/:id - Get a specific todo
router.get("/:id", getTodoById);

// POST /todos - Create a new todo
router.post("/", createTodo);

// PUT /todos/:id - Update full todo
router.put("/:id", updateTodo);

// PATCH /todos/:id - Partial update todo
router.patch("/:id", updateTodo);

// PATCH /todos/:id/toggle - Toggle completed status
router.patch("/:id/toggle", toggleTodo);

// DELETE /todos/:id - Delete a todo
router.delete("/:id", deleteTodo);

module.exports = router;
