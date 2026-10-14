import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import StatusBlock from '../components/StatusBlock'
import WishlistCard from '../components/WishlistCard'
import { getErrorMessage, getWishlist, removeFromWishlist } from '../services/api'
import { announceWishlistChange } from '../services/wishlistEvents'

/**
 * The wishlist page.
 *
 * Nothing here is remembered in the browser. The list is whatever
 * GET /wishlist returns for whoever the cookie says we are, which is why
 * it survives a refresh, a new tab and a fresh login on another machine —
 * and why signing in as somebody else shows their list, not a stale copy
 * of this one.
 */
export default function Wishlist() {
  // One object per completed request, tagged with the attempt that asked
  // for it, exactly as the products page does. `loading` is then derived
  // rather than stored, which keeps the effect free of the synchronous
  // setState that would cost a second render on every load.
  const [result, setResult] = useState(null)
  // Bumped by "Try Again" so the same request can be made a second time.
  const [attempt, setAttempt] = useState(0)
  // A failed *removal* is reported above the grid; the list itself is fine.
  const [removeError, setRemoveError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    getWishlist(controller.signal)
      .then(({ data }) => {
        setResult({ attempt, products: data.wishlist, error: '' })
      })
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return

        setResult({
          attempt,
          products: [],
          error: getErrorMessage(requestError, 'Please try again in a moment.'),
        })
      })

    return () => controller.abort()
  }, [attempt])

  // Anything the current attempt has not answered yet is still in flight.
  const loading = result?.attempt !== attempt
  const products = result?.products ?? []
  const error = result?.error ?? ''

  const handleRemove = useCallback(
    async (productId) => {
      setRemoveError('')

      // Drop the card immediately — waiting for the round trip to redraw
      // makes a button that plainly worked feel broken. The previous
      // result is kept so the card can be put back if the server
      // disagrees, which is the part an optimistic update usually skips.
      const snapshot = result

      setResult({
        ...snapshot,
        products: snapshot.products.filter((item) => item._id !== productId),
      })

      try {
        await removeFromWishlist(productId)
        announceWishlistChange()
      } catch (requestError) {
        setResult(snapshot)
        setRemoveError(
          getErrorMessage(requestError, 'Could not remove that product.'),
        )
      }
    },
    [result],
  )

  const renderWishlist = () => {
    if (loading) {
      return <StatusBlock variant="loading" title="Loading your wishlist…" />
    }

    if (error) {
      return (
        <StatusBlock
          variant="error"
          title="Something went wrong."
          message={`We couldn't load your wishlist. ${error}`}
        >
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Try Again
          </button>
        </StatusBlock>
      )
    }

    if (products.length === 0) {
      return (
        <StatusBlock
          variant="empty"
          icon="heart"
          title="Your wishlist is empty"
          message="Save products you love and find them here later."
        >
          <Link to="/products" className="btn btn--primary btn--sm">
            Browse Products
          </Link>
        </StatusBlock>
      )
    }

    return (
      <>
        {removeError && (
          <p className="alert alert--error" role="alert">
            {removeError}
          </p>
        )}

        <ul className="product-grid">
          {products.map((product) => (
            <li key={product._id}>
              <WishlistCard product={product} onRemove={handleRemove} />
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <header className="catalog__header">
          <p className="catalog__eyebrow">Saved for later</p>
          <h1 className="catalog__title">My Wishlist</h1>
          <p className="catalog__subtitle">
            {products.length > 0
              ? `${products.length} ${products.length === 1 ? 'product' : 'products'} saved.`
              : 'Everything you have saved lives here, on every device you sign in from.'}
          </p>
        </header>

        {renderWishlist()}
      </main>
    </div>
  )
}
