const { verifyToken, getTokenFromCookie } = require("../utils/auth.utils");
const UserModel = require("../models/user.model");

// ১. টোকেন বা সেশন যাচাই করার মিডলওয়্যার
function authenticateToken(req, res, next) {
  // সেশন চেক (express-session)
  if (req.session?.userId) {
    const user = UserModel.findById(req.session.userId);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // হেডার (Bearer) বা কুকি (Cookie) থেকে টোকেন নেওয়া
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearerToken || req.cookies?.token || getTokenFromCookie(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "লগইন করুন বা টোকেন দিন",
    });
  }

  // টোকেন ভেরিফাই করা
  const decoded = verifyToken(token);
  const user = decoded?.id ? UserModel.findById(decoded.id) : null;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "টোকেনটি সঠিক নয় বা মেয়াদ শেষ",
    });
  }

  req.user = user;
  next();
}

// ২. অপশনাল লগইন চেক (থাকলে ইউজার সেট করবে)
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
