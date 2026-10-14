import { useEffect, useState } from 'react'

/**
 * Returns `value` only once it has stopped changing for `delay` ms.
 *
 * The search box needs this: without it, typing "phone" fires five requests
 * and the UI flickers through five result sets. The input itself stays fully
 * controlled and instant — only the value that triggers the fetch lags behind.
 */
export function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)

    // Every new keystroke cancels the timer the previous one set.
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
