const TodoModel = require("../models/todo.model");

// ১. সব টু-ডু দেখা (Get All Todos)
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

// ২. নির্দিষ্ট একটি টু-ডু দেখা (Get Single Todo)
const getTodoById = (req, res, next) => {
  try {
    const todo = TodoModel.findById(req.params.id);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: "Todo পাওয়া যায়নি",
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

// ৩. নতুন টু-ডু তৈরি করা (Create Todo)
const createTodo = (req, res, next) => {
  try {
    const { title, description, priority, dueDate, completed } = req.body || {};

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title দেওয়া বাধ্যতামূলক",
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
      message: "Todo তৈরি সফল হয়েছে",
      data: newTodo,
    });
  } catch (error) {
    next(error);
  }
};

// ৪. টু-ডু আপডেট করা (Update Todo)
const updateTodo = (req, res, next) => {
  try {
    const updated = TodoModel.update(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Todo পাওয়া যায়নি",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Todo আপডেট সফল হয়েছে",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ৫. টু-ডু সম্পন্ন বা অসম্পন্ন টগল করা (Toggle Todo)
const toggleTodo = (req, res, next) => {
  try {
    const toggled = TodoModel.toggle(req.params.id);
    if (!toggled) {
      return res.status(404).json({
        success: false,
        message: "Todo পাওয়া যায়নি",
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

// ৬. টু-ডু মুছে ফেলা (Delete Todo)
const deleteTodo = (req, res, next) => {
  try {
    const isDeleted = TodoModel.delete(req.params.id);
    if (!isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Todo পাওয়া যায়নি",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Todo মুছে ফেলা হয়েছে",
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
