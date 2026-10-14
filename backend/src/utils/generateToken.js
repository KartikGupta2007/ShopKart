const jwt = require("jsonwebtoken");

const TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Signs a JWT for a customer.
 * The payload holds only the id — never the password or anything secret,
 * because a JWT payload is base64 encoded, not encrypted.
 */
const generateToken = (customerId) => {
  return jwt.sign({ id: customerId }, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
};

/**
 * Cookie flags used for both setting and clearing the auth cookie.
 * httpOnly  -> JavaScript on the page cannot read the token (blocks XSS theft)
 * secure    -> HTTPS only in production
 * sameSite  -> the browser will not attach it to cross-site requests (blocks CSRF)
 */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

const setAuthCookie = (res, token) => {
  res.cookie("token", token, { ...cookieOptions, maxAge: COOKIE_MAX_AGE });
};

const clearAuthCookie = (res) => {
  res.clearCookie("token", cookieOptions);
};

module.exports = { generateToken, setAuthCookie, clearAuthCookie, cookieOptions };
