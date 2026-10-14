const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const {
  createPaymentOrder,
  verifyPayment,
  markPaymentFailed,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} = require("../controllers/order.controller");

const router = express.Router();

// Orders belong to a customer — every route is protected.
router.use(protect);

router.post("/create-payment-order", createPaymentOrder);
// Same handler under the plain REST name the lab's Postman plan calls.
router.post("/", createPaymentOrder);
router.post("/verify-payment", verifyPayment);
router.get("/", getMyOrders);
router.get("/:id", getOrderById);
router.post("/:id/payment-failed", markPaymentFailed);
// Bonus: a stand-in admin endpoint, disabled in production.
router.patch("/:id/status", updateOrderStatus);

module.exports = router;
