const express = require("express");
const {
  registerCustomer,
  loginCustomer,
  getMyProfile,
  logoutCustomer,
  changePassword,
} = require("../controllers/customer.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

// Public
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);

// Protected
router.get("/me", protect, getMyProfile);
router.post("/logout", protect, logoutCustomer);
router.patch("/change-password", protect, changePassword);

module.exports = router;
