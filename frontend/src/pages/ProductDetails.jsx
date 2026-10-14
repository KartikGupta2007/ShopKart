import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AddToCartButton from '../components/AddToCartButton'
import Navbar from '../components/Navbar'
import ProductImage from '../components/ProductImage'
import StatusBlock from '../components/StatusBlock'
import WishlistButton from '../components/WishlistButton'
import { useWishlistIds } from '../hooks/useWishlistIds'
import { describeStock } from '../utils/describeStock'
import { formatPrice } from '../utils/formatPrice'
import { getErrorMessage, getProductById } from '../services/api'

/**
 * The product details page, mounted at /products/:id.
 *
 * `:id` is a URL parameter, not a query parameter — it identifies *which*
 * product this page is, so it belongs in the path. The listing page's filters
 * are query parameters instead, because they only narrow down a collection
 * that exists either way.
 */
export default function ProductDetails() {
  const { id } = useParams()
  const { isSaved, applyToggle } = useWishlistIds()

  // Tagged with the id it describes, so `loading` can be derived instead of
  // stored — and a leftover product can never be drawn under a new id.
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getProductById(id, controller.signal)
      .then(({ data }) => {
        setResult({ id, product: data.product, error: '', missing: false })
      })
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return

        const status = requestError.response?.status

        // To someone following a stale link, a malformed id (400) and a
        // deleted product (404) are the same story — the product is gone.
        const missing = status === 400 || status === 404

        setResult({
          id,
          product: null,
          missing,
          error: missing
            ? ''
            : getErrorMessage(requestError, 'Please try again in a moment.'),
        })
      })

    return () => controller.abort()
  }, [id])

  const loading = result?.id !== id
  const product = result?.product ?? null

  const renderProduct = () => {
    if (loading) {
      return <StatusBlock variant="loading" title="Loading product…" />
    }

    if (result.missing) {
      return (
        <StatusBlock
          variant="empty"
          title="Product not found."
          message="This product may have been removed from the catalogue."
        >
          <Link to="/products" className="btn btn--primary btn--sm">
            Browse all products
          </Link>
        </StatusBlock>
      )
    }

    if (result.error) {
      return (
        <StatusBlock
          variant="error"
          title="Something went wrong while loading this product."
          message={result.error}
        >
          <Link to="/products" className="btn btn--ghost btn--sm">
            Back to products
          </Link>
        </StatusBlock>
      )
    }

    const stockStatus = describeStock(product.stock)

    return (
      <article className="details">
        <div className="details__media">
          <ProductImage
            src={product.image}
            alt={product.name}
            className="product-image--large"
          />
        </div>

        <div className="details__info">
          <span className="chip">{product.category}</span>

          <h1 className="details__name">{product.name}</h1>

          <p className="details__price">{formatPrice(product.price)}</p>

          <p className={`stock stock--${stockStatus.tone}`}>
            <span className="stock__dot" aria-hidden="true" />
            {stockStatus.label}
          </p>

          <div className="details__description">
            <h2>About this product</h2>
            <p>{product.description}</p>
          </div>

          <div className="details__actions">
            <AddToCartButton productId={product._id} stock={product.stock} />

            <WishlistButton
              productId={id}
              saved={isSaved(id)}
              onToggled={applyToggle}
            />
          </div>

          <dl className="details__meta">
            <div>
              <dt>Category</dt>
              <dd>{product.category}</dd>
            </div>
            <div>
              <dt>In stock</dt>
              <dd>{product.stock} units</dd>
            </div>
            <div>
              <dt>Product ID</dt>
              <dd className="details__id">{product._id}</dd>
            </div>
            {product.createdAt && (
              <div>
                <dt>Listed on</dt>
                <dd>
                  {new Date(product.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </article>
    )
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <Link to="/products" className="details__back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to products
        </Link>

        {renderProduct()}
      </main>
    </div>
  )
}
