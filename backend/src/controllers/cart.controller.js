const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const { ApiError, asyncHandler } = require("../utils/ApiError");

// What a cart row draws, plus `stock` so the quantity controls know where
// to stop. The description stays behind GET /products/:id.
const CART_FIELDS = "name price category image stock";

/**
 * Every handler below reads the customer from `req.user`, which the auth
 * middleware put there after verifying the JWT. No route takes a userId:
 * if the client could name the user, it could name somebody else's cart.
 *
 * Every handler also answers with the whole, freshly populated cart. The
 * client then replaces its copy instead of patching it, so the navbar, the
 * product cards and the cart page can never drift apart from the database.
 */

/** Turns `:productId` into an ObjectId, or rejects it as a 400. */
const parseProductId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, "Invalid product ID");
  }

  return new mongoose.Types.ObjectId(value);
};

/**
 * Validates the PATCH body's quantity.
 *
 * JSON can carry "3" as easily as 3, so a numeric string is accepted —
 * but a blank, a boolean, 2.5 or "abc" is the caller's mistake.
 */
const parseQuantity = (value) => {
  if (
    value === undefined ||
    value === null ||
    typeof value === "boolean" ||
    String(value).trim() === ""
  ) {
    throw new ApiError(400, "Quantity is required and must be a number");
  }

  const quantity = Number(value);

  if (!Number.isInteger(quantity)) {
    throw new ApiError(400, "Quantity must be a whole number");
  }

  if (quantity < 1) {
    throw new ApiError(
      400,
      "Quantity must be at least 1. Use DELETE /cart/:productId to remove an item"
    );
  }

  return quantity;
};

/** The current stock of a product, or a 404 if it is not in the catalogue. */
const findProduct = async (productId) => {
  const product = await Product.findById(productId).select("name stock").lean();

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return product;
};

/**
 * The cart as the API returns it: each row's product populated from the
 * catalogue, so the price and stock are always today's, never a copy.
 */
const readCart = async (userId) => {
  const customer = await Customer.findById(userId)
    .select("cart")
    .populate({ path: "cart.product", select: CART_FIELDS });

  return (
    (customer?.cart ?? [])
      // A product deleted from the catalogue leaves a dangling reference,
      // which populate turns into null. Drop those rows so the page never
      // renders an item with no price.
      .filter((item) => item.product)
      // Rows are appended, so the newest is last — reverse for the UI.
      // slice() first, because reverse() would otherwise mutate the document.
      .slice()
      .reverse()
  );
};

const unitsLabel = (count) => `${count} ${count === 1 ? "unit" : "units"}`;

/**
 * POST /cart/:productId
 *
 * Adds one unit: a new row at quantity 1, or +1 on the row already there.
 *
 * As with the wishlist, the rules live in the update filters rather than in
 * an `if` that runs before the write. Reading the cart, checking it in
 * JavaScript and then saving would let two quick clicks both pass the stock
 * check before either wrote. Here each step only matches while its rule
 * still holds, so MongoDB applies the check and the change together:
 *
 *   1. increment  — only if the row exists AND its quantity is below stock
 *   2. push       — only if no row for this product exists yet
 *   3. increment  — again, for the click that lost a race to step 2
 *
 * If none of them matched, the row exists and is already at the stock
 * limit. matchedCount is the signal, not modifiedCount — `timestamps: true`
 * adds `$set: { updatedAt }` to every update, so everything counts as
 * "modified".
 */
const addToCart = asyncHandler(async (req, res) => {
  const productId = parseProductId(req.params.productId);
  const product = await findProduct(productId);

  if (product.stock < 1) {
    throw new ApiError(400, `${product.name} is out of stock`);
  }

  const increment = () =>
    Customer.updateOne(
      {
        _id: req.user._id,
        cart: {
          $elemMatch: { product: productId, quantity: { $lt: product.stock } },
        },
      },
      { $inc: { "cart.$.quantity": 1 } }
    );

  const push = () =>
    Customer.updateOne(
      { _id: req.user._id, "cart.product": { $ne: productId } },
      { $push: { cart: { product: productId, quantity: 1 } } }
    );

  let { matchedCount } = await increment();

  if (matchedCount === 0) ({ matchedCount } = await push());
  if (matchedCount === 0) ({ matchedCount } = await increment());

  if (matchedCount === 0) {
    throw new ApiError(
      400,
      `Only ${unitsLabel(product.stock)} of ${product.name} in stock, and your cart already has the maximum`
    );
  }

  const cart = await readCart(req.user._id);

  return res.status(200).json({
    success: true,
    message: "Cart updated",
    cart,
  });
});

/**
 * GET /cart
 *
 * One request returns every row with its product already populated, so the
 * browser never has to fetch products one by one to draw the cart.
 */
const getCart = asyncHandler(async (req, res) => {
  const cart = await readCart(req.user._id);

  return res.status(200).json({
    success: true,
    cart,
  });
});

/**
 * PATCH /cart/:productId   body: { "quantity": 3 }
 *
 * Sets the quantity outright rather than nudging it by ±1. The client says
 * what it wants the number to be, so a retried request cannot end up
 * applying the same change twice.
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const productId = parseProductId(req.params.productId);
  // Express 5 leaves req.body undefined when nothing was sent at all.
  const quantity = parseQuantity(req.body?.quantity);
  const product = await findProduct(productId);

  const inCart = req.user.cart.some((item) => item.product.equals(productId));

  if (!inCart) {
    throw new ApiError(404, "Product is not in your cart");
  }

  // Checked against the stock *now*, not the stock when the item was first
  // added — the catalogue may have sold out since then.
  if (quantity > product.stock) {
    throw new ApiError(
      400,
      product.stock === 0
        ? `${product.name} is out of stock`
        : `Only ${unitsLabel(product.stock)} of ${product.name} in stock`
    );
  }

  // The positional `$` updates only the row the filter matched. The filter
  // re-checks the row is there, in case another tab removed it meanwhile.
  const { matchedCount } = await Customer.updateOne(
    { _id: req.user._id, "cart.product": productId },
    { $set: { "cart.$.quantity": quantity } }
  );

  if (matchedCount === 0) {
    throw new ApiError(404, "Product is not in your cart");
  }

  const cart = await readCart(req.user._id);

  return res.status(200).json({
    success: true,
    message: "Quantity updated",
    cart,
  });
});

/**
 * DELETE /cart/:productId
 *
 * Deliberately does not check that the product still exists: removing a
 * row for a product that was deleted from the catalogue has to keep working.
 */
const removeFromCart = asyncHandler(async (req, res) => {
  const productId = parseProductId(req.params.productId);

  const { matchedCount } = await Customer.updateOne(
    { _id: req.user._id, "cart.product": productId },
    { $pull: { cart: { product: productId } } }
  );

  if (matchedCount === 0) {
    throw new ApiError(404, "Product is not in your cart");
  }

  const cart = await readCart(req.user._id);

  return res.status(200).json({
    success: true,
    message: "Product removed from cart",
    cart,
  });
});

module.exports = { addToCart, getCart, updateCartItem, removeFromCart };
