import { Link } from 'react-router-dom'
import ProductImage from './ProductImage'
import { useCart } from '../context/CartContext'
import { describeStock } from '../utils/describeStock'
import { exceedsStock } from '../utils/cartTotals'
import { formatPrice } from '../utils/formatPrice'

/**
 * One row of the cart page: product, [-] qty [+], line total, Remove.
 *
 * The price and stock are the product's *current* values — the cart stores
 * a reference, not a copy — so a price change in the catalogue shows up
 * here, and in the subtotal, the next time the cart is read.
 */
export default function CartItem({ item }) {
  const { product, quantity } = item
  const { _id, name, category, price, image, stock } = product
  const { updateQuantity, removeFromCart, pending, itemErrors } = useCart()

  // Both live in the shared state, keyed by product, so a failure is still
  // reported after a rolled-back removal re-mounts this row.
  const busy = Boolean(pending[_id])
  const error = itemErrors[_id]
  const stockStatus = describeStock(stock)
  const overStock = exceedsStock(item)
  const detailsUrl = `/products/${_id}`

  // A row above the stock steps straight down to the stock: anything in
  // between would still be refused by the server.
  const decrease = () => updateQuantity(_id, overStock ? stock : quantity - 1)
  const increase = () => updateQuantity(_id, quantity + 1)

  return (
    <li className="cart-item">
      <Link to={detailsUrl} className="cart-item__media" tabIndex={-1} aria-hidden="true">
        <ProductImage src={image} alt={name} />
      </Link>

      <div className="cart-item__info">
        <span className="chip">{category}</span>
        <h3 className="cart-item__name">
          <Link to={detailsUrl}>{name}</Link>
        </h3>
        <p className="cart-item__unit">{formatPrice(price)} each</p>

        {overStock ? (
          <p className="stock stock--warn">
            <span className="stock__dot" aria-hidden="true" />
            {stock === 0
              ? 'Now out of stock — remove it to continue'
              : `Only ${stock} left — lower the quantity to continue`}
          </p>
        ) : (
          <p className={`stock stock--${stockStatus.tone}`}>
            <span className="stock__dot" aria-hidden="true" />
            {stockStatus.label}
          </p>
        )}
      </div>

      <div className="cart-item__controls">
        <div className="qty" role="group" aria-label={`Quantity of ${name}`}>
          <button
            type="button"
            className="qty__btn"
            onClick={decrease}
            // At 1 the row is removed with Remove, never by counting down to
            // 0 — and a sold-out row has no valid quantity to step down to.
            disabled={busy || quantity <= 1 || stock === 0}
            aria-label={`Decrease quantity of ${name}`}
            title={quantity <= 1 ? 'Use Remove to take this out of your cart' : undefined}
          >
            −
          </button>
          {/* Optimistic: the new number shows at once, and dims until the
              server confirms it (or it snaps back). */}
          <span className={`qty__value${busy ? ' qty__value--busy' : ''}`} aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="qty__btn"
            onClick={increase}
            disabled={busy || quantity >= stock}
            aria-label={`Increase quantity of ${name}`}
            title={quantity >= stock ? `Only ${stock} in stock` : undefined}
          >
            +
          </button>
        </div>

        <p className="cart-item__total">{formatPrice(price * quantity)}</p>

        <button
          type="button"
          className="cart-item__remove"
          onClick={() => removeFromCart(_id)}
          disabled={busy}
        >
          Remove
          <span className="sr-only"> {name} from cart</span>
        </button>
      </div>

      {error && (
        <p className="cart-item__error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
