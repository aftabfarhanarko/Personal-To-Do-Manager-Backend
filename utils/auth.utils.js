const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "todo_secret_key";

// 1. Password Hashing (পাসওয়ার্ড হ্যাশ ও ভেরিফাই)

// পাসওয়ার্ড হ্যাশ করা
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// পাসওয়ার্ড মিল আছে কিনা যাচাই করা
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, originalHash] = storedHash.split(":");
  return crypto.scryptSync(password, salt, 64).toString("hex") === originalHash;
}

// 2. JWT (টোকেন জেনারেট ও ভেরিফাই)

// JWT টোকেন তৈরি করা (মেয়াদ ৭ দিন)
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// JWT টোকেন ভেরিফাই করা
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// 3. Cookie-Parser (কুকি সেট ও রিড করা)

// রেসপন্সে সুরক্ষিত HTTP-only কুকি সেট করা
function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true, // ব্রাউজার JS অ্যাক্সেস বন্ধ (নিরাপদ)
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // ৭ দিন
  });
}

// রিকোয়েস্ট থেকে কুকি টোকেন বের করা
function getTokenFromCookie(req) {
  if (req?.cookies?.token) return req.cookies.token;
  const match = req?.headers?.cookie?.match(/token=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : null;
}

// 4. Express-Session (সেশন সেট ও ক্লিয়ার করা)

// express-session এ ইউজার সেভ করা
function setSessionUser(req, user) {
  if (req.session) {
    req.session.userId = user.id;
    req.session.user = user;
  }
}

// কুকি ও সেশন মুছে ফেলা (লগআউট)
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
