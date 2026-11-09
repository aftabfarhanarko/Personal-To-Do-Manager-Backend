const UserModel = require("../models/user.model");
const {
  generateToken,
  setAuthCookie,
  setSessionUser,
  destroyCookieSession,
} = require("../utils/auth.utils");
const { getUserAuditLogs } = require("../middleware/auditLogger");

// 1. User Registration (Register)
const register = (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // Input validation
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required (password must be at least 6 characters)",
      });
    }

    // Check if email is already registered
    if (UserModel.findByEmail(email)) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Create user and generate token
    const user = UserModel.create({ name, email, password });
    const token = generateToken({ id: user.id, email: user.email });

    // Attach user to req for audit logger
    req.user = user;

    // Set cookie and session
    setAuthCookie(res, token);
    setSessionUser(req, user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// 2. User Login (Login)
const login = (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Verify user credentials
    const user = UserModel.verifyCredentials(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken({ id: user.id, email: user.email });

    // Attach user to req for audit logger
    req.user = user;

    // Set cookie and session
    setAuthCookie(res, token);
    setSessionUser(req, user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// 3. User Logout (Logout)
const logout = (req, res, next) => {
  try {
    destroyCookieSession(res);

    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.status(200).json({
          success: true,
          message: "Logged out successfully",
        });
      });
      return;
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get Current User Profile (Profile)
const getProfile = (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};

// 5. Get Current User Activity & User-Agent Audit Logs
const getActivity = (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    const activity = getUserAuditLogs(userId);
    return res.status(200).json({
      success: true,
      count: activity.length,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  getActivity,
};
