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
const {
  checkTodoRoute,
  checkTodoExists,
  validateTodo,
} = require("../middleware/todos.middleware");

// 1. Verify that the requested route path exists (returns 404 if invalid)
router.use(checkTodoRoute);

// 2. Optional authentication middleware
router.use(optionalAuth);

// 3. Route handlers
router.get("/", getAllTodos);
router.post("/", validateTodo, createTodo);

// Routes targeting a specific ID verify item existence first
router.get("/:id", checkTodoExists, getTodoById);
router.put("/:id", checkTodoExists, updateTodo);
router.patch("/:id", checkTodoExists, updateTodo);
router.patch("/:id/toggle", checkTodoExists, toggleTodo);
router.delete("/:id", checkTodoExists, deleteTodo);

module.exports = router;
