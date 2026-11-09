const UserModel = require("../models/user.model");
const {
  generateToken,
  setAuthCookie,
  setSessionUser,
  destroyCookieSession,
} = require("../utils/auth.utils");

// ১. নতুন ইউজার রেজিস্ট্রেশন (Register)
const register = (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // সাধারণ ভ্যালিডেশন
    if (!name || !email || !password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "সব তথ্য দিন (পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে)",
      });
    }

    // ইমেইল আগে থেকেই আছে কিনা চেক
    if (UserModel.findByEmail(email)) {
      return res.status(409).json({
        success: false,
        message: "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট রয়েছে",
      });
    }

    // ইউজার তৈরি ও টোকেন জেনারেট
    const user = UserModel.create({ name, email, password });
    const token = generateToken({ id: user.id, email: user.email });

    // কুকি ও সেশন সেট করা
    setAuthCookie(res, token);
    setSessionUser(req, user);

    return res.status(201).json({
      success: true,
      message: "রেজিস্ট্রেশন সফল হয়েছে",
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// ২. ইউজার লগইন (Login)
const login = (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "ইমেইল ও পাসওয়ার্ড প্রদান করুন",
      });
    }

    // পাসওয়ার্ড ভেরিফাই করা
    const user = UserModel.verifyCredentials(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "ভুল ইমেইল অথবা পাসওয়ার্ড",
      });
    }

    const token = generateToken({ id: user.id, email: user.email });

    // কুকি ও সেশন সেট করা
    setAuthCookie(res, token);
    setSessionUser(req, user);

    return res.status(200).json({
      success: true,
      message: "লগইন সফল হয়েছে",
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

// ৩. ইউজার লগআউট (Logout)
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

// ৪. বর্তমান ইউজারের প্রোফাইল (Profile)
const getProfile = (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
};
