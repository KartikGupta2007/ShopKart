import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CartItem from '../components/CartItem'
import Navbar from '../components/Navbar'
import StatusBlock from '../components/StatusBlock'
import { useCart } from '../context/CartContext'
import { exceedsStock } from '../utils/cartTotals'
import { formatPrice } from '../utils/formatPrice'

/**
 * The cart page, mounted at /cart.
 *
 * It fetches nothing of its own. The rows, the loading and error states and
 * every total come from the shared CartProvider — the same state the navbar
 * badge reads — so the two cannot disagree about what is in the cart.
 */
export default function Cart() {
  const {
    cartItems,
    loading,
    error,
    itemCount,
    totalUnits,
    subtotal,
    refreshCart,
  } = useCart()
  const navigate = useNavigate()

  // Opening the cart re-reads it in the background, so a price or stock
  // change made since it was loaded is shown before anyone checks out.
  useEffect(() => {
    refreshCart()
    // Once per visit, not every time refreshCart's identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A row whose quantity outgrew the stock has to be fixed first —
  // the checkout would refuse it anyway.
  const blocked = cartItems.some(exceedsStock)

  const renderCart = () => {
    if (loading) {
      return <StatusBlock variant="loading" title="Loading your cart..." />
    }

    if (error) {
      return (
        <StatusBlock
          variant="error"
          title="Unable to load your cart."
          message={error}
        >
          <button type="button" className="btn btn--primary btn--sm" onClick={refreshCart}>
            Try Again
          </button>
        </StatusBlock>
      )
    }

    if (cartItems.length === 0) {
      return (
        <StatusBlock
          variant="empty"
          icon="cart"
          title="Your cart is empty 🛒"
          message="Looks like you haven't added anything yet."
        >
          <Link to="/products" className="btn btn--primary btn--sm">
            Browse Products
          </Link>
        </StatusBlock>
      )
    }

    return (
      <div className="cart">
        <ul className="cart__items">
          {cartItems.map((item) => (
            <CartItem key={item.product._id} item={item} />
          ))}
        </ul>

        <aside className="summary" aria-labelledby="summary-title">
          <h2 id="summary-title" className="summary__title">
            Order Summary
          </h2>

          <dl className="summary__rows">
            <div>
              <dt>Items</dt>
              <dd>{itemCount}</dd>
            </div>
            <div>
              <dt>Total units</dt>
              <dd>{totalUnits}</dd>
            </div>
            <div className="summary__subtotal">
              <dt>Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
          </dl>

          <p className="summary__hint">Shipping and taxes are calculated at checkout.</p>

          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={blocked}
            onClick={() => navigate('/checkout')}
          >
            Proceed to Checkout
          </button>

          {blocked && (
            <p className="summary__warning" role="alert">
              Some items exceed the stock now available. Update them to continue.
            </p>
          )}

          <Link to="/products" className="summary__continue">
            Continue shopping
          </Link>
        </aside>
      </div>
    )
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <header className="catalog__header">
          <p className="catalog__eyebrow">Ready to buy</p>
          <h1 className="catalog__title">My Cart</h1>
          <p className="catalog__subtitle">
            {totalUnits > 0
              ? `${totalUnits} ${totalUnits === 1 ? 'unit' : 'units'} across ${itemCount} ${itemCount === 1 ? 'product' : 'products'}.`
              : 'Your cart is saved to your account, so it follows you across devices.'}
          </p>
        </header>

        {renderCart()}
      </main>
    </div>
  )
}
