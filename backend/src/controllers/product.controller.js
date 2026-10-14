const mongoose = require("mongoose");
const Product = require("../models/product.model");
const { ApiError, asyncHandler } = require("../utils/ApiError");
const escapeRegex = require("../utils/escapeRegex");

const REQUIRED_FIELDS = [
  "name",
  "description",
  "price",
  "category",
  "image",
  "stock",
];

// The product listing UI only draws the image, name, category, price and
// stock — so that is all the list endpoint sends. `description` is fetched
// later by GET /products/:id, when the details page actually needs it.
const LIST_FIELDS = "name price category image stock";

// Whitelist of ?sort= values mapped to their Mongoose sort object.
// A whitelist means a client can never push arbitrary keys into .sort().
const SORT_OPTIONS = {
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
};

const DEFAULT_SORT = SORT_OPTIONS.newest;

/** Treats undefined, null and "" as missing, but keeps a legitimate 0. */
const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === "";

/**
 * POST /products
 * Public for this lab — admin-only authorization comes in a later lab.
 */
const createProduct = asyncHandler(async (req, res) => {
  // Express 5 leaves req.body undefined when a request arrives with no body at
  // all, so default it — a body-less POST is a missing-field 400, not a crash.
  const body = req.body ?? {};

  const { name, description, price, category, image, stock } = body;

  const missing = REQUIRED_FIELDS.filter((field) => isBlank(body[field]));

  if (missing.length > 0) {
    throw new ApiError(400, `Missing required field(s): ${missing.join(", ")}`);
  }

  // JSON bodies can carry "2999" as easily as 2999, so coerce before checking.
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    throw new ApiError(400, "Price must be a number greater than 0");
  }

  const numericStock = Number(stock);

  if (!Number.isInteger(numericStock) || numericStock < 0) {
    throw new ApiError(400, "Stock must be a whole number of 0 or more");
  }

  const product = await Product.create({
    name,
    description,
    price: numericPrice,
    category,
    image,
    stock: numericStock,
  });

  return res.status(201).json({
    success: true,
    message: "Product created successfully",
    product,
  });
});

/**
 * GET /products
 * GET /products?search=keyboard&category=Electronics&sort=price_asc
 *
 * One endpoint, one query object built up from whichever filters arrived.
 * Filtering in MongoDB (not in React) means the browser only ever downloads
 * the rows it is about to draw, however large the catalogue grows.
 */
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, sort } = req.query;

  const filter = {};

  // "keyboard" should match "Mechanical Keyboard" — a substring, case-insensitive.
  if (!isBlank(search)) {
    filter.name = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  // Category is an exact match, but anchored + case-insensitive so that
  // ?category=electronics finds the "Electronics" products too.
  if (!isBlank(category)) {
    filter.category = {
      $regex: `^${escapeRegex(category.trim())}$`,
      $options: "i",
    };
  }

  let sortBy = DEFAULT_SORT;

  if (!isBlank(sort)) {
    sortBy = SORT_OPTIONS[sort];

    if (!sortBy) {
      throw new ApiError(
        400,
        `Invalid sort value. Use one of: ${Object.keys(SORT_OPTIONS).join(", ")}`
      );
    }
  }

  const products = await Product.find(filter).select(LIST_FIELDS).sort(sortBy);

  return res.status(200).json({
    success: true,
    count: products.length,
    products,
  });
});

/**
 * GET /products/:id
 * Returns the full document — the details page needs the description too.
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // A string that is not a 24-character ObjectId is the caller's mistake (400),
  // not a missing product (404) — so check the shape before hitting MongoDB.
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid product ID");
  }

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

module.exports = { createProduct, getProducts, getProductById };
