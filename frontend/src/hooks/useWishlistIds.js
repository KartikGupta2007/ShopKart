import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import { getWishlistIds } from '../services/api'

/**
 * Which products the current customer has saved, as a Set of ids.
 *
 * A page that shows hearts needs this once on mount — one small request
 * rather than one per card. `applyToggle` then keeps the Set in step with
 * the answer the server just gave a button, so the heart fills instantly
 * instead of waiting for a second round trip to confirm what we know.
 */
export function useWishlistIds() {
  // null until the first response lands, so a heart is never drawn empty
  // just because the request has not come back yet.
  const [ids, setIds] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getWishlistIds(controller.signal)
      .then(({ data }) => setIds(new Set(data.ids)))
      .catch((error) => {
        if (axios.isCancel(error)) return

        // The grid itself still renders. A heart that stays outlined is a
        // far better failure than a products page that refuses to load.
        setIds(new Set())
      })

    return () => controller.abort()
  }, [])

  const applyToggle = useCallback((productId, saved) => {
    setIds((current) => {
      const next = new Set(current ?? [])

      if (saved) next.add(productId)
      else next.delete(productId)

      return next
    })
  }, [])

  return {
    ready: ids !== null,
    isSaved: (productId) => Boolean(ids?.has(productId)),
    applyToggle,
  }
}
