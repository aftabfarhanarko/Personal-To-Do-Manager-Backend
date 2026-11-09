const { verifyToken, getTokenFromCookie } = require("../utils/auth.utils");
const UserModel = require("../models/user.model");

// 1. Authenticate user via Express-Session, Bearer token, or Cookie
function authenticateToken(req, res, next) {
  // Check express-session
  if (req.session?.userId) {
    const user = UserModel.findById(req.session.userId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Check Bearer token in header or token in cookie
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || req.cookies?.token || getTokenFromCookie(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required. Please login or provide a token",
    });
  }

  // Verify JWT token
  const decoded = verifyToken(token);
  const user = decoded?.id ? UserModel.findById(decoded.id) : null;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  req.user = user;
  next();
}

// 2. Optional authentication middleware (attaches user if session or token exists)
function optionalAuth(req, res, next) {
  if (req.session?.userId) {
    req.user = UserModel.findById(req.session.userId);
    return next();
  }

  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || req.cookies?.token || getTokenFromCookie(req);

  if (token) {
    const decoded = verifyToken(token);
    if (decoded?.id) {
      req.user = UserModel.findById(decoded.id);
    }
  }

  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
};
