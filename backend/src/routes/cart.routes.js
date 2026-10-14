const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
} = require("../controllers/cart.controller");

const router = express.Router();

// A cart belongs to a customer, so every route is protected. Guarding the
// router once means a route added later cannot be left open by accident.
router.use(protect);

// No `:userId` anywhere — the customer comes from the verified token.
router.get("/", getCart);
router.post("/:productId", addToCart);
router.patch("/:productId", updateCartItem);
router.delete("/:productId", removeFromCart);

module.exports = router;
