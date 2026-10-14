const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'

// One promise for the whole session, so paying twice never adds the
// script twice. Reset on failure, so the next attempt can try again.
let loading = null

/**
 * Loads Razorpay Standard Checkout and resolves true once `window.Razorpay`
 * exists — or false if the script could not load (offline, blocked by an
 * ad blocker...). Callers must handle false rather than assume it is there.
 */
export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve(true)

  if (!loading) {
    loading = new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = CHECKOUT_SRC
      script.async = true
      script.onload = () => resolve(Boolean(window.Razorpay))
      script.onerror = () => {
        script.remove()
        loading = null
        resolve(false)
      }
      document.body.appendChild(script)
    })
  }

  return loading
}
