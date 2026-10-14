const express = require("express");
const {
  createProduct,
  getProducts,
  getProductById,
} = require("../controllers/product.controller");

const router = express.Router();

// All public for this lab. Search, category and sort arrive on GET /products
// as query parameters, so no extra routes are needed for them.
router.post("/", createProduct);
router.get("/", getProducts);
router.get("/:id", getProductById);

module.exports = router;
