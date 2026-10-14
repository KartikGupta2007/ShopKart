/**
 * Everything the UI shows about the cart as a whole, derived from the rows.
 *
 * None of these numbers is stored — not in MongoDB and not in React state.
 * A stored subtotal is a second answer to "what does this cost?", and the
 * moment a price or quantity changes without it, the two disagree. Working
 * it out from price × quantity on every render means there is only one.
 */
export const getCartTotals = (cartItems) =>
  cartItems.reduce(
    (totals, { product, quantity }) => ({
      // Distinct products — "2 items" for Keyboard × 2 + Mouse × 1.
      itemCount: totals.itemCount + 1,
      // Total quantity — what the navbar badge shows: Cart (3).
      totalUnits: totals.totalUnits + quantity,
      subtotal: totals.subtotal + product.price * quantity,
    }),
    { itemCount: 0, totalUnits: 0, subtotal: 0 },
  )

/**
 * A row can outgrow its product's stock after it was added — someone else
 * bought the last few. The server refuses to *raise* such a quantity, but
 * the row itself is still there, so the cart page has to point it out.
 */
export const exceedsStock = ({ product, quantity }) => quantity > product.stock
