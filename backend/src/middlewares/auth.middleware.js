const jwt = require("jsonwebtoken");
const Customer = require("../models/customer.model");
const { ApiError, asyncHandler } = require("../utils/ApiError");

/**
 * Guards protected routes:
 * cookie -> verify JWT -> load the customer -> attach to req.user
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    throw new ApiError(401, "Not authorized, no token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Expired or tampered token — both are just "not authorized" to the client.
    throw new ApiError(401, "Not authorized, invalid or expired token");
  }

  const customer = await Customer.findById(decoded.id);

  if (!customer) {
    throw new ApiError(401, "Not authorized, customer no longer exists");
  }

  req.user = customer;
  next();
});

module.exports = { protect };
