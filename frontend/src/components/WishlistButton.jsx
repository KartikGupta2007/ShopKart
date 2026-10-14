import { useState } from 'react'
import { getErrorMessage, toggleWishlist } from '../services/api'
import { announceWishlistChange } from '../services/wishlistEvents'

/**
 * The heart. One button, four states: idle, saving, saved, failed.
 *
 * `saved` is owned by whoever renders this — the page already knows which
 * products are in the wishlist, and keeping one answer per page rather than
 * one per button is what stops two cards for the same product disagreeing.
 */
export default function WishlistButton({ productId, saved, onToggled, block = false }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    // The guard the spec asks for: a second click while the first request
    // is still open does nothing, so one heart cannot fire two writes.
    if (busy) return

    setBusy(true)
    setError('')

    try {
      const { data } = await toggleWishlist(productId)

      // The server says what the state is now; we do not assume !saved.
      onToggled(productId, data.saved)

      // Tell the navbar its count is stale. See services/wishlistEvents.
      announceWishlistChange()
    } catch (requestError) {
      setError(
        getErrorMessage(requestError, 'Unable to save product. Please try again.'),
      )
    } finally {
      setBusy(false)
    }
  }

  const label = busy
    ? 'Saving…'
    : saved
      ? 'Remove from Wishlist'
      : 'Add to Wishlist'

  return (
    <div className="wishlist-action">
      <button
        type="button"
        className={`btn btn--ghost wishlist-btn${saved ? ' wishlist-btn--saved' : ''}${block ? ' btn--block' : ''}`}
        onClick={handleClick}
        disabled={busy}
        /* Tells a screen reader this is a toggle and which way it is set,
           rather than leaving it to read the label and guess. */
        aria-pressed={saved}
      >
        {busy ? (
          <span className="spinner spinner--sm" aria-hidden="true" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            /* Outline when not saved, solid once it is — the state is
               readable at a glance, before the label is even read. */
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path
              d="M12 20.3s-7.4-4.6-7.4-9.6a4.25 4.25 0 0 1 7.4-2.85 4.25 4.25 0 0 1 7.4 2.85c0 5-7.4 9.6-7.4 9.6Z"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {label}
      </button>

      {error && (
        <p className="wishlist-action__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
