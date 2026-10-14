import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

/**
 * Add to Cart, for the product card and the details page.
 *
 * The button owns nothing but its error message. Whether a request is
 * running and how many are already in the cart both come from the shared
 * cart state — so the card, the navbar and the cart page are always reading
 * the same number, and a click here updates all three at once.
 */
export default function AddToCartButton({ productId, stock, block = false }) {
  const { addToCart, quantityOf, pending } = useCart()
  const [error, setError] = useState('')

  const inCart = quantityOf(productId)
  const adding = pending[productId] === 'add'
  const busy = Boolean(pending[productId])
  const soldOut = stock <= 0
  // The server would refuse a unit past the stock anyway; greying the
  // button out first saves the customer a round trip to find that out.
  const atLimit = !soldOut && inCart >= stock

  const handleClick = async () => {
    setError('')

    const { ok, message } = await addToCart(productId)

    if (!ok && message) setError(message)
  }

  let label = 'Add to Cart'
  if (soldOut) label = 'Out of stock'
  else if (adding) label = 'Adding…'
  else if (atLimit) label = 'Max quantity in cart'
  else if (inCart > 0) label = 'Add Another'

  return (
    <div className="cart-action">
      <button
        type="button"
        className={`btn btn--primary cart-btn${block ? ' btn--block' : ''}`}
        onClick={handleClick}
        disabled={soldOut || atLimit || busy}
      >
        {adding ? (
          <span className="spinner spinner--sm spinner--light" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" strokeLinejoin="round" />
            <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        )}
        {label}
      </button>

      {inCart > 0 && !error && (
        <p className="cart-action__note" role="status">
          {inCart} in your cart · <Link to="/cart">View cart</Link>
        </p>
      )}

      {error && (
        <p className="cart-action__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
