const express = require("express");
const { protect } = require("../middlewares/auth.middleware");
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistIds,
} = require("../controllers/wishlist.controller");

const router = express.Router();

// A wishlist only exists in relation to a customer, so there is no such thing
// as an unauthenticated wishlist route. Guarding the router once means a route
// added later cannot be left unprotected by forgetting to repeat `protect`.
router.use(protect);

// No `:userId` anywhere — the customer comes from the verified token.
router.get("/", getWishlist);
router.get("/ids", getWishlistIds);
router.post("/:productId", addToWishlist);
router.delete("/:productId", removeFromWishlist);
router.patch("/:productId/toggle", toggleWishlist);

module.exports = router;
