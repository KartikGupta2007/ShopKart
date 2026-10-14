const crypto = require("crypto");
const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const { ORDER_STATUSES } = require("../models/order.model");
const { getRazorpay } = require("../config/razorpay");
const { ApiError, asyncHandler } = require("../utils/ApiError");

/**
 * Like the cart, no route here takes a userId. The customer is always
 * `req.user`, set by the auth middleware from the verified JWT, and every
 * order query is filtered by it — so guessing another order's id finds
 * nothing.
 */

/* ---------------- shipping address ---------------- */

const ADDRESS_FIELDS = {
  fullName: "Full name",
  phone: "Phone number",
  addressLine1: "Address",
  city: "City",
  state: "State",
  pincode: "Pincode",
};

/**
 * Checks the shipping address and returns a trimmed copy holding only the
 * known fields. The browser validates too, but anything it sends can be
 * hand-crafted, so the same rules are enforced again here.
 */
const parseShippingAddress = (input) => {
  if (!input || typeof input !== "object") {
    throw new ApiError(400, "Shipping address is required");
  }

  const address = {};

  for (const [field, label] of Object.entries(ADDRESS_FIELDS)) {
    const value = typeof input[field] === "string" ? input[field].trim() : "";

    // Covers missing, non-string and whitespace-only values alike.
    if (!value) throw new ApiError(400, `${label} is required`);

    address[field] = value;
  }

  if (address.fullName.length < 3) {
    throw new ApiError(400, "Full name must be at least 3 characters");
  }

  // Indian mobile numbers: 10 digits starting 6–9.
  if (!/^[6-9][0-9]{9}$/.test(address.phone)) {
    throw new ApiError(400, "Phone number must be a valid 10-digit mobile number");
  }

  if (!/^[0-9]{6}$/.test(address.pincode)) {
    throw new ApiError(400, "Pincode must contain 6 digits");
  }

  return address;
};

const parseOrderId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(404, "Order not found");
  }

  return new mongoose.Types.ObjectId(value);
};

/** One of the customer's own orders, or a 404 — never someone else's. */
const findOwnOrder = async (orderId, userId) => {
  const order = await Order.findOne({ _id: parseOrderId(orderId), user: userId });

  if (!order) throw new ApiError(404, "Order not found");

  return order;
};

/** Constant-time comparison, so the check leaks nothing through timing. */
const signaturesMatch = (expected, received) => {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(received ?? ""), "utf8");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ---------------- handlers ---------------- */

/**
 * POST /orders/create-payment-order   body: { shippingAddress }
 *
 * Turns the customer's cart into a PENDING_PAYMENT order and a matching
 * Razorpay Order. Only the address is read from the body: the items come
 * from the cart stored on the server, and the prices and stock from the
 * Product collection as it is *now*. A `totalAmount` in the body is ignored.
 *
 * The cart is left untouched. It is only cleared once the payment has been
 * verified, so abandoning or failing the payment loses nothing.
 */
const createPaymentOrder = asyncHandler(async (req, res) => {
  const shippingAddress = parseShippingAddress(req.body?.shippingAddress);

  // Re-read rather than trusting req.user: the cart may have changed since
  // the auth middleware loaded the customer.
  const customer = await Customer.findById(req.user._id).select("cart").lean();
  const cart = customer?.cart ?? [];

  if (cart.length === 0) {
    throw new ApiError(400, "Your cart is empty");
  }

  // One query for every product in the cart, at today's price and stock.
  const products = await Product.find({
    _id: { $in: cart.map((item) => item.product) },
  })
    .select("name price image stock")
    .lean();

  const byId = new Map(products.map((product) => [String(product._id), product]));

  const items = cart.map(({ product: productId, quantity }) => {
    const product = byId.get(String(productId));

    if (!product) {
      throw new ApiError(
        400,
        "A product in your cart is no longer available. Remove it from your cart and try again."
      );
    }

    if (product.stock < quantity) {
      throw new ApiError(
        400,
        product.stock === 0
          ? `${product.name} is out of stock.`
          : `Insufficient stock for ${product.name}. Only ${product.stock} left.`
      );
    }

    // The snapshot: what the customer is buying, as it is at this moment.
    return {
      product: product._id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
    };
  });

  // Rounded to paise so floating-point noise never reaches Razorpay.
  const totalAmount =
    Math.round(items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;

  // Fails fast with a 500 if the keys are missing, before anything is saved.
  const razorpay = getRazorpay();

  const order = await Order.create({
    user: req.user._id,
    items,
    shippingAddress,
    totalAmount,
  });

  let razorpayOrder;
  try {
    razorpayOrder = await razorpay.orders.create({
      // Razorpay counts INR in paise: ₹7,497 → 749700.
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: order._id.toString(),
    });
  } catch (error) {
    // No Razorpay order means this ShopKart order can never be paid.
    order.paymentStatus = "FAILED";
    await order.save();

    console.error("Razorpay order creation failed:", error?.error ?? error);
    throw new ApiError(502, "Could not start the payment. Please try again.");
  }

  order.razorpayOrderId = razorpayOrder.id;
  await order.save();

  return res.status(201).json({
    success: true,
    shopKartOrderId: order._id,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
    // The Key ID is public by design. The Key Secret never leaves the server.
    key: process.env.RAZORPAY_KEY_ID,
  });
});

/**
 * POST /orders/verify-payment
 * body: { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * The browser saying "payment succeeded" proves nothing — anyone can call
 * this endpoint with made-up values. Razorpay signs the pair
 * `order_id|payment_id` with our Key Secret, which only Razorpay and this
 * server know, so a matching HMAC is the proof.
 *
 * The order id in that HMAC is the one saved on our order when it was
 * created, not the one in the request body: otherwise a valid signature
 * from a cheap order could be replayed against an expensive one.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const {
    shopKartOrderId,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  } = req.body ?? {};

  if (!shopKartOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, "Payment details are incomplete");
  }

  const order = await findOwnOrder(shopKartOrderId, req.user._id);

  // A retried request after success — answer with the order, change nothing.
  if (order.paymentStatus === "PAID") {
    return res.status(200).json({ success: true, message: "Payment already verified", order });
  }

  if (!order.razorpayOrderId) {
    throw new ApiError(400, "This order has no payment attached to it");
  }

  if (razorpayOrderId && razorpayOrderId !== order.razorpayOrderId) {
    throw new ApiError(400, "Payment does not belong to this order");
  }

  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Payments are not configured on the server");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (!signaturesMatch(expectedSignature, razorpaySignature)) {
    // The order stays PENDING and the cart stays full: a forged request
    // must not be able to change anything.
    throw new ApiError(400, "Invalid payment signature");
  }

  order.paymentStatus = "PAID";
  order.status = "PLACED";
  order.razorpayPaymentId = razorpayPaymentId;
  order.paidAt = new Date();
  await order.save();

  // Only now, with the payment proven and the order saved, is the cart emptied.
  await Customer.updateOne({ _id: req.user._id }, { $set: { cart: [] } });

  return res.status(200).json({
    success: true,
    message: "Payment verified. Order placed.",
    order,
  });
});

/**
 * POST /orders/:id/payment-failed
 *
 * Called when Razorpay Checkout reports a failed payment. Records it so the
 * order shows as FAILED rather than pending forever. It cannot do harm when
 * forged: a PAID order is never touched, and the cart is never cleared here.
 */
const markPaymentFailed = asyncHandler(async (req, res) => {
  const order = await findOwnOrder(req.params.id, req.user._id);

  if (order.paymentStatus === "PENDING") {
    order.paymentStatus = "FAILED";
    await order.save();
  }

  return res.status(200).json({ success: true, order });
});

/**
 * GET /orders — the customer's orders, newest first.
 *
 * Orders whose payment never completed are left out by default — they are
 * checkout attempts, not purchases. `?all=true` includes them.
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const filter = { user: req.user._id };

  if (req.query.all !== "true") filter.paymentStatus = "PAID";

  const orders = await Order.find(filter).sort({ createdAt: -1 });

  return res.status(200).json({
    success: true,
    count: orders.length,
    orders,
  });
});

/**
 * GET /orders/:id
 *
 * Looked up by id *and* owner together. Another customer's order answers
 * 404, exactly like an id that does not exist, so the response does not
 * even confirm that the order is there.
 */
const getOrderById = asyncHandler(async (req, res) => {
  const order = await findOwnOrder(req.params.id, req.user._id);

  return res.status(200).json({ success: true, order });
});

/**
 * PATCH /orders/:id/status   body: { status }   — bonus, development only
 *
 * Stands in for an admin panel so the status timeline can be demonstrated.
 * Only moves a paid order forward: PLACED → CONFIRMED → SHIPPED → DELIVERED.
 */
const FULFILMENT_FLOW = ORDER_STATUSES.slice(ORDER_STATUSES.indexOf("PLACED"));

const updateOrderStatus = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    throw new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  }

  const next = req.body?.status;

  if (!FULFILMENT_FLOW.includes(next)) {
    throw new ApiError(400, `Status must be one of ${FULFILMENT_FLOW.join(", ")}`);
  }

  const order = await findOwnOrder(req.params.id, req.user._id);

  if (order.paymentStatus !== "PAID") {
    throw new ApiError(400, "Only a paid order can be progressed");
  }

  if (FULFILMENT_FLOW.indexOf(next) <= FULFILMENT_FLOW.indexOf(order.status)) {
    throw new ApiError(400, `Order is already ${order.status}`);
  }

  order.status = next;
  await order.save();

  return res.status(200).json({ success: true, message: `Order ${next}`, order });
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  markPaymentFailed,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
};
