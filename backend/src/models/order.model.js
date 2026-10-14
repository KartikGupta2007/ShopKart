const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PLACED",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"];

/**
 * One purchased line.
 *
 * Unlike a cart row, this is a *copy* of the product as it was at checkout.
 * The cart has to show today's price, so it only holds a reference. An order
 * records what the customer actually paid, so the name, price and image are
 * frozen here — a later price change, rename or even deletion of the product
 * must not rewrite history. `product` is kept as a link back to the catalogue.
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // The lab's sample schema says ref: "User"; this project's account
    // model has been called Customer since Lab 01.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    // Worked out on the server from the snapshot prices — never taken from
    // the request body.
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "PENDING",
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "PENDING_PAYMENT",
    },
    // Identifiers only. No card data ever reaches this server — Razorpay
    // Checkout collects it on its own page.
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    paidAt: { type: Date },
  },
  {
    timestamps: true, // createdAt is the order date shown in My Orders
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
