const TodoModel = require("../models/todo.model");

// ১. Title দেওয়া হয়েছে কিনা যাচাই করার মিডলওয়্যার
function validateTodo(req, res, next) {
  const { title } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: "Title দেওয়া বাধ্যতামূলক",
    });
  }

  next();
}

// ২. Todo আইডি অনুযায়ী বিদ্যমান কিনা যাচাই
function checkTodoExists(req, res, next) {
  const todo = TodoModel.findById(req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo পাওয়া যায়নি",
    });
  }

  req.todo = todo;
  next();
}

module.exports = {
  validateTodo,
  checkTodoExists,
};
