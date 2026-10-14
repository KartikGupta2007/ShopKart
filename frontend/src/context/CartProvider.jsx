import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { CartContext } from './CartContext'
import {
  addToCart as addToCartRequest,
  getCart,
  getErrorMessage,
  removeFromCart as removeFromCartRequest,
  updateCartQuantity,
} from '../services/api'
import { getCartTotals } from '../utils/cartTotals'

// One shared empty array, so "no cart" is the same value on every render
// and the memoised totals below are not recomputed for nothing.
const NO_ITEMS = []

const idOf = (item) => item.product._id

/** A copy of `map` without `key` — for the per-product lookups below. */
const omit = (map, key) => {
  if (!(key in map)) return map
  const next = { ...map }
  delete next[key]
  return next
}

/**
 * The one copy of the cart in the browser.
 *
 * The product card, the navbar badge, the cart page and the order summary
 * all read from here. None of them fetches the cart for itself: separate
 * copies are how a navbar ends up saying Cart (2) above a page listing 3.
 *
 * It is still the *server's* cart. This provider never works out a new cart
 * for itself — every write sends a request, and the cart that comes back
 * replaces the copy held here. The only guesses it makes are the optimistic
 * ones below, and those are overwritten (or rolled back) within one round trip.
 */
export function CartProvider({ children }) {
  const { user } = useAuth()

  // Bumped by "Try Again" after a failed load.
  const [attempt, setAttempt] = useState(0)

  // The last answer, tagged with the customer + attempt it belongs to — the
  // same trick the pages use, so `loading` is derived instead of stored and
  // a cart can never be shown under the wrong customer after a re-login.
  const [snapshot, setSnapshot] = useState(null)

  // Which products have a request in flight, and what kind:
  // { [productId]: 'add' | 'update' | 'remove' }. Per product, so pressing
  // + on one row greys out that row only, not the whole cart.
  const [pending, setPending] = useState({})

  // The last failure per product, kept here rather than in the row: a
  // removal is optimistic, so the row has already unmounted by the time a
  // failed request puts it back — local state would have gone with it.
  const [itemErrors, setItemErrors] = useState({})

  const key = user ? `${user._id}|${attempt}` : null

  // Mirrors `key` for code that runs after an await, where the value
  // captured at render time may already be out of date.
  const keyRef = useRef(key)
  useEffect(() => {
    keyRef.current = key
  }, [key])

  /*
   * Responses do not always come back in the order they were sent. Every
   * request takes a ticket, and an answer older than the newest one already
   * applied is dropped — otherwise a slow reply could undo a newer one.
   */
  const lastTicket = useRef(0)
  const appliedTicket = useRef(0)

  const isFresh = useCallback((ticket) => {
    if (ticket < appliedTicket.current) return false
    appliedTicket.current = ticket
    return true
  }, [])

  // Synchronous guard against a double click: state updates are async, so
  // two clicks in the same frame could both see `pending` as empty.
  const busyIds = useRef(new Set())

  // Writes still in flight, and whether any of them overlapped. See below.
  const inFlight = useRef(0)
  const overlapped = useRef(false)

  /* ---------------- loading ---------------- */

  useEffect(() => {
    if (!key) return

    const controller = new AbortController()
    const ticket = ++lastTicket.current

    getCart(controller.signal)
      .then(({ data }) => {
        if (isFresh(ticket)) setSnapshot({ key, items: data.cart, error: '' })
      })
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return

        if (isFresh(ticket)) {
          setSnapshot({
            key,
            items: [],
            error: getErrorMessage(requestError, 'Please try again in a moment.'),
          })
        }
      })

    return () => controller.abort()
  }, [key, isFresh])

  /** Re-reads the cart in the background, without a loading screen. */
  const sync = useCallback(async () => {
    const owner = keyRef.current
    if (!owner) return

    const ticket = ++lastTicket.current

    try {
      const { data } = await getCart()

      if (keyRef.current === owner && isFresh(ticket)) {
        setSnapshot({ key: owner, items: data.cart, error: '' })
      }
    } catch {
      // Keep what is on screen. If the API is really down, the next write
      // will say so next to the button that was pressed.
    }
  }, [isFresh])

  /* ---------------- writes ---------------- */

  /**
   * Every write goes through here.
   *
   *   optimistic — applied at once, so the row reacts before the server does
   *   rollback   — undoes exactly that change if the request fails
   *
   * On success the server's cart replaces ours, guesses included. When two
   * writes overlap, the replies can each reflect only part of what happened,
   * so once the last one settles the cart is read again, once, to be sure.
   *
   * Resolves to { ok, message } rather than throwing, so a caller can show
   * the error inline without a try/catch around every click.
   */
  const mutate = useCallback(
    async (productId, kind, request, { optimistic, rollback } = {}) => {
      const owner = keyRef.current

      if (!owner) return { ok: false, message: 'Please log in to use your cart.' }
      if (busyIds.current.has(productId)) return { ok: false, message: '' }

      busyIds.current.add(productId)
      setPending((current) => ({ ...current, [productId]: kind }))
      setItemErrors((current) => omit(current, productId))

      if (inFlight.current > 0) overlapped.current = true
      inFlight.current += 1

      const ticket = ++lastTicket.current

      // Only ever patch the snapshot that belongs to this customer.
      const patch = (change) =>
        setSnapshot((current) =>
          current?.key === owner ? { ...current, items: change(current.items) } : current,
        )

      if (optimistic) patch(optimistic)

      let failed = false

      try {
        const { data } = await request()

        if (keyRef.current === owner && isFresh(ticket)) {
          setSnapshot({ key: owner, items: data.cart, error: '' })
        }

        return { ok: true, message: data.message }
      } catch (requestError) {
        failed = true
        if (rollback) patch(rollback)

        const message = getErrorMessage(requestError, 'Could not update your cart.')
        setItemErrors((current) => ({ ...current, [productId]: message }))

        return { ok: false, message }
      } finally {
        busyIds.current.delete(productId)
        setPending((current) => omit(current, productId))

        inFlight.current -= 1

        if (inFlight.current === 0 && (failed || overlapped.current)) {
          overlapped.current = false
          sync()
        }
      }
    },
    [isFresh, sync],
  )

  /** +1 unit. Not optimistic: the button says "Adding…" until the server agrees. */
  const addToCart = useCallback(
    (productId) => mutate(productId, 'add', () => addToCartRequest(productId)),
    [mutate],
  )

  const updateQuantity = useCallback(
    (productId, quantity) => {
      // Captured by the optimistic step, used by the rollback.
      let previous

      return mutate(productId, 'update', () => updateCartQuantity(productId, quantity), {
        optimistic: (items) =>
          items.map((item) => {
            if (idOf(item) !== productId) return item
            previous = item.quantity
            return { ...item, quantity }
          }),
        rollback: (items) =>
          previous === undefined
            ? items
            : items.map((item) =>
                idOf(item) === productId ? { ...item, quantity: previous } : item,
              ),
      })
    },
    [mutate],
  )

  const removeFromCart = useCallback(
    (productId) => {
      let removed
      let position = -1

      return mutate(productId, 'remove', () => removeFromCartRequest(productId), {
        optimistic: (items) => {
          position = items.findIndex((item) => idOf(item) === productId)
          removed = items[position]
          return items.filter((item) => idOf(item) !== productId)
        },
        // Put the row back where it was, not at the end of the list.
        rollback: (items) =>
          !removed || items.some((item) => idOf(item) === productId)
            ? items
            : [...items.slice(0, position), removed, ...items.slice(position)],
      })
    },
    [mutate],
  )

  /**
   * Empties the local copy after the server has emptied the real cart —
   * i.e. after a payment was verified. It does not call the API itself:
   * the cart is cleared on the server as part of placing the order, and
   * only then is this copy brought in line, so the navbar reads Cart (0)
   * straight away instead of after a refresh.
   */
  const clearCart = useCallback(() => {
    const owner = keyRef.current
    if (!owner) return

    // Any answer still in flight predates the order, so it must not
    // bring the old items back.
    appliedTicket.current = ++lastTicket.current

    setItemErrors({})
    setSnapshot({ key: owner, items: [], error: '' })
  }, [])

  /* ---------------- derived ---------------- */

  const settled = key !== null && snapshot?.key === key
  const loading = key !== null && !settled
  const error = settled ? snapshot.error : ''
  const cartItems = settled ? snapshot.items : NO_ITEMS

  /**
   * "Refresh cart from backend". After a failed load it retries with the
   * loading screen; otherwise it quietly re-reads, so a price or stock
   * change made since the cart was loaded shows up without a flash.
   */
  const refreshCart = useCallback(() => {
    // Nothing to refresh logged out, and the first load is already on its way.
    if (!key || !settled) return

    if (error) setAttempt((current) => current + 1)
    else sync()
  }, [key, settled, error, sync])

  // Subtotal, item count and total units — computed, never stored.
  const totals = useMemo(() => getCartTotals(cartItems), [cartItems])

  const quantityOf = useCallback(
    (productId) => cartItems.find((item) => idOf(item) === productId)?.quantity ?? 0,
    [cartItems],
  )

  const value = useMemo(
    () => ({
      cartItems,
      loading,
      error,
      pending,
      itemErrors,
      ...totals,
      quantityOf,
      addToCart,
      updateQuantity,
      removeFromCart,
      refreshCart,
      clearCart,
    }),
    [
      cartItems,
      loading,
      error,
      pending,
      itemErrors,
      totals,
      quantityOf,
      addToCart,
      updateQuantity,
      removeFromCart,
      refreshCart,
      clearCart,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
