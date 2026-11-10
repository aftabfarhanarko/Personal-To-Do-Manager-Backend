const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "todo_secret_key";

// 1. Password Hashing (bcrypt)

// Hash password using bcrypt
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Verify password against stored hash (supports bcrypt and legacy scrypt)
function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (storedHash.includes(":")) {
    const [salt, originalHash] = storedHash.split(":");
    return crypto.scryptSync(password, salt, 64).toString("hex") === originalHash;
  }
  return bcrypt.compareSync(password, storedHash);
}

// 2. JWT (Token generation and verification)

// Generate JWT token (expires in 2 hours)
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

// Verify JWT token signature and expiration
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// 3. Cookie-Parser Helpers

// Set HTTP-only secure cookie on response (expires in 2 hours)
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true, // Prevents client-side JS access
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000, // 2 hours in ms
  });
}

// Extract auth token from request cookies
function getTokenFromCookie(req) {
  if (req?.cookies?.token) return req.cookies.token;
  const match = req?.headers?.cookie?.match(/token=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

// 4. Express-Session Helpers

// Save user data into express-session
function setSessionUser(req, user) {
  if (req.session) {
    req.session.userId = user.id;
    req.session.user = user;
  }
}

// Clear auth cookie and destroy session on logout
function destroyCookieSession(res) {
  res.clearCookie("token");
}

function destroySession(req, res) {
  res.clearCookie("token");
  if (req.session) {
    req.session.destroy();
    res.clearCookie("connect.sid");
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  setAuthCookie,
  getTokenFromCookie,
  setSessionUser,
  destroySession,
  destroyCookieSession,
  clearAuthCookie: destroyCookieSession,
};
