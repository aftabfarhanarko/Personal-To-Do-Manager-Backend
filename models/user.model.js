const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, verifyPassword } = require("../utils/auth.utils");

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function readUsers() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureStorage();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

const UserModel = {
  findAll() {
    return readUsers().map(sanitizeUser);
  },

  findById(id) {
    const users = readUsers();
    const user = users.find((u) => u.id === id);
    return sanitizeUser(user);
  },

  findByEmail(email) {
    if (!email) return null;
    const users = readUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    return sanitizeUser(user);
  },

  findRawByEmail(email) {
    if (!email) return null;
    const users = readUsers();
    return (
      users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      ) || null
    );
  },

  create({ name, email, password }) {
    const users = readUsers();
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error("Email already registered");
    }

    const newUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    return sanitizeUser(newUser);
  },

  verifyCredentials(email, password) {
    const user = this.findRawByEmail(email);
    if (!user) return null;

    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) return null;

    return sanitizeUser(user);
  },

  // Helper for tests/resets
  clearAll() {
    writeUsers([]);
  },
};

module.exports = UserModel;
