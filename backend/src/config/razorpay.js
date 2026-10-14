const Razorpay = require("razorpay");
const { ApiError } = require("../utils/ApiError");

let client = null;

/**
 * The Razorpay SDK client, created on first use.
 *
 * Lazy rather than at import time so the rest of the API (auth, products,
 * cart) still boots without payment keys — checkout then fails with a clear
 * 500 instead of the whole server refusing to start.
 *
 * The Key Secret lives only here and in the signature check. It is never
 * put in a response, and never stored in MongoDB.
 */
const getRazorpay = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Payments are not configured on the server");
  }

  if (!client) {
    client = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }

  return client;
};

module.exports = { getRazorpay };
