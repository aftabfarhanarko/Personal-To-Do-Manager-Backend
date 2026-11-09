const express = require("express");
const router = express.Router();

const { register, login, logout, getProfile, getActivity } = require("../controllers/auth.controllers");
const { authenticateToken } = require("../middleware/auth.middleware");

// Public authentication routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Protected routes
router.get("/me", authenticateToken, getProfile);
router.get("/activity", authenticateToken, getActivity);
router.get("/my-activity", authenticateToken, getActivity);
router.get("/user-agent-logs", authenticateToken, getActivity);

module.exports = router;
