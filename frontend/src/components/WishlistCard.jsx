import { Link } from 'react-router-dom'
import ProductImage from './ProductImage'
import { describeStock } from '../utils/describeStock'
import { formatPrice } from '../utils/formatPrice'

/**
 * A saved product on the wishlist page.
 *
 * Deliberately reuses the .product-card styles: a saved product should not
 * look like a different kind of object from the same product in the
 * catalogue. Only the second action differs — Remove instead of the heart.
 *
 * Every field comes from the populated API response. Because the wishlist
 * stores a reference rather than a copy, a price change in the Product
 * collection shows up here on the next load with nothing else to update.
 */
export default function WishlistCard({ product, onRemove }) {
  const { _id, name, category, price, image, stock } = product
  const stockStatus = describeStock(stock)
  const detailsUrl = `/products/${_id}`

  return (
    <article className="product-card">
      <Link to={detailsUrl} className="product-card__media" tabIndex={-1} aria-hidden="true">
        <ProductImage src={image} alt={name} />
        {!stockStatus.inStock && (
          <span className="product-card__sold-out">Sold out</span>
        )}
      </Link>

      <div className="product-card__body">
        <span className="chip">{category}</span>

        <h3 className="product-card__name">
          <Link to={detailsUrl}>{name}</Link>
        </h3>

        <p className="product-card__price">{formatPrice(price)}</p>

        <p className={`stock stock--${stockStatus.tone}`}>
          <span className="stock__dot" aria-hidden="true" />
          {stockStatus.label}
        </p>

        <div className="product-card__actions">
          <Link to={detailsUrl} className="btn btn--primary btn--block">
            View Details
          </Link>

          <button
            type="button"
            className="btn btn--ghost btn--block wishlist-remove"
            onClick={() => onRemove(_id)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path
                d="M12 20.3s-7.4-4.6-7.4-9.6a4.25 4.25 0 0 1 7.4-2.85 4.25 4.25 0 0 1 7.4 2.85c0 5-7.4 9.6-7.4 9.6Z"
                strokeLinejoin="round"
              />
            </svg>
            Remove
            <span className="sr-only"> {name} from wishlist</span>
          </button>
        </div>
      </div>
    </article>
  )
}
