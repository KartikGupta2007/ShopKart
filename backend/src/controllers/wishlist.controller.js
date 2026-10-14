const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const { ApiError, asyncHandler } = require("../utils/ApiError");

// Exactly what a wishlist card draws. The description stays behind
// GET /products/:id, which is the only screen that shows it.
const CARD_FIELDS = "name price category image stock";

/**
 * Every handler below reads the customer from `req.user`, which the auth
 * middleware put there after verifying the JWT. No route takes a userId:
 * if the client could name the user, it could name somebody else's.
 */

/** Turns `:productId` into an ObjectId, or rejects it as a 400. */
const parseProductId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new ApiError(400, "Invalid product ID");
  }

  return new mongoose.Types.ObjectId(value);
};

const assertProductExists = async (productId) => {
  // exists() only asks the index whether the _id is there — no document is
  // pulled back, because nothing here needs the product's contents.
  if (!(await Product.exists({ _id: productId }))) {
    throw new ApiError(404, "Product not found");
  }
};

/** The saved ids, straight from the database rather than from req.user. */
const readWishlistIds = async (userId) => {
  const customer = await Customer.findById(userId).select("wishlist").lean();

  return customer?.wishlist ?? [];
};

const isSaved = (user, productId) =>
  user.wishlist.some((savedId) => savedId.equals(productId));

/**
 * POST /wishlist/:productId
 *
 * The duplicate check lives in the query filter rather than in an `if`
 * above it. `wishlist: { $ne: productId }` matches this customer only
 * while the product is absent, so of two clicks that arrive together
 * exactly one can match — the loser matches nothing and gets the 409.
 * Checking in JavaScript first would let both pass before either wrote.
 *
 * modifiedCount cannot be used to detect that: `timestamps: true` adds a
 * `$set: { updatedAt }` to every update, so the document always counts as
 * modified whether or not the array actually changed.
 */
const addToWishlist = asyncHandler(async (req, res) => {
  const productId = parseProductId(req.params.productId);

  await assertProductExists(productId);

  const { matchedCount } = await Customer.updateOne(
    { _id: req.user._id, wishlist: { $ne: productId } },
    { $addToSet: { wishlist: productId } }
  );

  if (matchedCount === 0) {
    throw new ApiError(409, "Product is already in your wishlist");
  }

  const ids = await readWishlistIds(req.user._id);

  return res.status(201).json({
    success: true,
    message: "Product added to wishlist",
    count: ids.length,
  });
});

/**
 * GET /wishlist
 *
 * populate() swaps each stored ObjectId for the product it points at, so one
 * request returns everything the cards need instead of the browser having to
 * fetch each product by id.
 */
const getWishlist = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.user._id).populate({
    path: "wishlist",
    select: CARD_FIELDS,
  });

  const wishlist = customer.wishlist
    // A product deleted from the catalogue leaves its id behind as a dangling
    // reference, and populate turns that into a null. Dropping those here is
    // what stops the page rendering a card with no data in it.
    .filter(Boolean)
    // Saved ids are appended, so the newest is last — reverse for the UI.
    // slice() first, because reverse() would otherwise mutate the document.
    .slice()
    .reverse();

  return res.status(200).json({
    success: true,
    count: wishlist.length,
    wishlist,
  });
});

/**
 * DELETE /wishlist/:productId
 *
 * Deliberately does not check that the product still exists: removing a
 * dangling reference to a deleted product has to keep working.
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
  const productId = parseProductId(req.params.productId);

  // Same trick as the add: the filter matches only while the product is
  // actually in the array, so matchedCount tells us whether there was
  // anything to remove. See the note there about modifiedCount.
  const { matchedCount } = await Customer.updateOne(
    { _id: req.user._id, wishlist: productId },
    { $pull: { wishlist: productId } }
  );

  if (matchedCount === 0) {
    throw new ApiError(404, "Product is not in your wishlist");
  }

  const ids = await readWishlistIds(req.user._id);

  return res.status(200).json({
    success: true,
    message: "Product removed from wishlist",
    count: ids.length,
  });
});

/**
 * PATCH /wishlist/:productId/toggle
 *
 * One request for what the heart button actually means: "flip this".
 * Sending add or remove from the client would mean the client deciding
 * which one applies, and it can only guess from state that may be stale.
 */
const toggleWishlist = asyncHandler(async (req, res) => {
  const productId = parseProductId(req.params.productId);

  const wasSaved = isSaved(req.user, productId);

  if (wasSaved) {
    await Customer.updateOne(
      { _id: req.user._id },
      { $pull: { wishlist: productId } }
    );
  } else {
    // Only worth checking the catalogue when adding — see remove, above.
    await assertProductExists(productId);

    await Customer.updateOne(
      { _id: req.user._id },
      { $addToSet: { wishlist: productId } }
    );
  }

  const ids = await readWishlistIds(req.user._id);

  // `saved` is read back from the database rather than assumed from
  // `wasSaved`, so the button is told what actually happened even if the
  // same product was toggled from another tab a moment earlier.
  const saved = ids.some((savedId) => savedId.equals(productId));

  return res.status(200).json({
    success: true,
    saved,
    count: ids.length,
    message: saved
      ? "Product added to wishlist"
      : "Product removed from wishlist",
  });
});

/**
 * GET /wishlist/ids
 *
 * The ids alone, with no populate. The product grid uses them to decide
 * which hearts are filled and the navbar uses the count — neither needs a
 * single product field, so neither should pay for the join.
 */
const getWishlistIds = asyncHandler(async (req, res) => {
  const ids = await readWishlistIds(req.user._id);

  return res.status(200).json({
    success: true,
    count: ids.length,
    ids,
  });
});

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
  toggleWishlist,
  getWishlistIds,
};
