import { Link } from 'react-router-dom'
import AddToCartButton from './AddToCartButton'
import ProductImage from './ProductImage'
import WishlistButton from './WishlistButton'
import { describeStock } from '../utils/describeStock'
import { formatPrice } from '../utils/formatPrice'

/**
 * One product in the grid. Every value on screen comes from the API
 * response — nothing here is hardcoded.
 *
 * The card knows nothing about fetching or filtering: it takes a product
 * and draws it, which is what lets the listing page reuse it for whatever
 * MongoDB sent back. `saved` follows the same rule — the page looked the
 * wishlist up once, and the card is only told the answer for its product.
 */
export default function ProductCard({ product, saved, onToggled }) {
  const { _id, name, category, price, image, stock } = product
  const stockStatus = describeStock(stock)
  const detailsUrl = `/products/${_id}`

  return (
    <article className="product-card">
      {/* The whole image is a link too — a bigger target than the button alone. */}
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
          <AddToCartButton productId={_id} stock={stock} block />

          <Link to={detailsUrl} className="btn btn--ghost btn--block">
            View Details
          </Link>

          <WishlistButton
            productId={_id}
            saved={saved}
            onToggled={onToggled}
            block
          />
        </div>
      </div>
    </article>
  )
}
