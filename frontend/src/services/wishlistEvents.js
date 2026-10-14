/**
 * A one-line notification channel for "the wishlist changed on the server".
 *
 * The problem it solves: the heart on a product card and the count in the
 * navbar are siblings in the tree, so a click on one cannot reach the other
 * by passing props. A store would fix that, but this lab is deliberately
 * before Context and Redux — and the wishlist is not frontend state anyway,
 * it is a row in MongoDB.
 *
 * So nothing is stored here. The event carries no payload; it only says
 * "go and ask the server again". Every listener re-fetches, which keeps the
 * backend the single source of truth and means a listener can never drift
 * out of sync with it by replaying a change badly.
 */
const WISHLIST_CHANGED = 'shopkart:wishlist-changed'

/** Call after any successful write, so other components can catch up. */
export const announceWishlistChange = () => {
  window.dispatchEvent(new Event(WISHLIST_CHANGED))
}

/** Subscribe; returns the unsubscribe function for useEffect's cleanup. */
export const onWishlistChange = (listener) => {
  window.addEventListener(WISHLIST_CHANGED, listener)

  return () => window.removeEventListener(WISHLIST_CHANGED, listener)
}
