const TodoModel = require("../models/todo.model");

// 1. Get All Todos
const getAllTodos = (req, res, next) => {
  try {
    const todos = TodoModel.findAll(req.query);
    return res.status(200).json({
      success: true,
      count: todos.length,
      data: todos,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Single Todo by ID
const getTodoById = (req, res, next) => {
  try {
    const todo = req.todo || TodoModel.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: `Todo with ID '${req.params.id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: todo,
    });
  } catch (error) {
    next(error);
  }
};

// 3. Create New Todo
const createTodo = (req, res, next) => {
  try {
    const { title, description, priority, dueDate, completed } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const newTodo = TodoModel.create({
      title: title.trim(),
      description,
      priority,
      dueDate,
      completed,
      userId: req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Todo created successfully",
      data: newTodo,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Existing Todo
const updateTodo = (req, res, next) => {
  try {
    const updated = TodoModel.update(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `Todo with ID '${req.params.id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Todo updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Toggle Todo Completed Status
const toggleTodo = (req, res, next) => {
  try {
    const toggled = TodoModel.toggle(req.params.id);
    if (!toggled) {
      return res.status(404).json({
        success: false,
        message: `Todo with ID '${req.params.id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: toggled,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Delete Todo
const deleteTodo = (req, res, next) => {
  try {
    const isDeleted = TodoModel.delete(req.params.id);
    if (!isDeleted) {
      return res.status(404).json({
        success: false,
        message: `Todo with ID '${req.params.id}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Todo deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTodos,
  getTodoById,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
};
