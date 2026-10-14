const Customer = require("../models/customer.model");
const { ApiError, asyncHandler } = require("../utils/ApiError");
const {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
} = require("../utils/generateToken");

/**
 * POST /customers/register
 * Public
 */
const registerCustomer = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;

  if (!fullName || !email || !password || !phone) {
    throw new ApiError(400, "All fields are required");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existingCustomer = await Customer.findOne({
    email: email.toLowerCase().trim(),
  });

  if (existingCustomer) {
    throw new ApiError(409, "Email already registered");
  }

  // The pre-save hook on the model hashes the password before it hits MongoDB.
  const customer = await Customer.create({ fullName, email, password, phone });

  return res.status(201).json({
    success: true,
    message: "Customer registered successfully",
    customer: customer.toPublicJSON(),
  });
});

/**
 * POST /customers/login
 * Public
 */
const loginCustomer = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // password has select:false on the schema, so ask for it explicitly.
  const customer = await Customer.findOne({
    email: email.toLowerCase().trim(),
  }).select("+password");

  // Same message for "no such email" and "wrong password" so the response
  // cannot be used to discover which emails are registered.
  if (!customer) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordCorrect = await customer.comparePassword(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = generateToken(customer._id);
  setAuthCookie(res, token);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    customer: customer.toPublicJSON(),
  });
});

/**
 * GET /customers/me
 * Protected — auth middleware has already put the customer on req.user.
 */
const getMyProfile = asyncHandler(async (req, res) => {
  return res.status(200).json(req.user.toPublicJSON());
});

/**
 * POST /customers/logout
 * Protected
 */
const logoutCustomer = asyncHandler(async (req, res) => {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

/**
 * PATCH /customers/change-password
 * Protected — bonus task.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from the old password");
  }

  const customer = await Customer.findById(req.user._id).select("+password");

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const isPasswordCorrect = await customer.comparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Old password is incorrect");
  }

  customer.password = newPassword; // the pre-save hook hashes it
  await customer.save();

  // Old tokens should not survive a password change.
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: "Password changed successfully. Please log in again.",
  });
});

module.exports = {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
  changePassword,
};
