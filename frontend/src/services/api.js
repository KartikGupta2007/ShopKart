import axios from 'axios'

/**
 * One axios instance for the whole app.
 *
 * withCredentials: true is the important bit. The backend sends the JWT in an
 * HttpOnly cookie, and by default the browser will not attach cookies to a
 * cross-origin XHR (localhost:5173 -> localhost:5000 are different origins).
 * This flag tells the browser to send the cookie on requests and to store the
 * Set-Cookie that comes back. The backend must answer with
 * Access-Control-Allow-Credentials: true for it to work.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export const registerCustomer = (payload) =>
  api.post('/customers/register', payload)

export const loginCustomer = (credentials) =>
  api.post('/customers/login', credentials)

export const getMyProfile = () => api.get('/customers/me')

export const logoutCustomer = () => api.post('/customers/logout')

/* ---------------- products ---------------- */

/**
 * GET /products, optionally narrowed by search / category / sort.
 *
 * Only filters that actually have a value are put on the URL, so an
 * untouched page requests plain `/products` instead of
 * `/products?search=&category=&sort=` — which keeps the request readable
 * in the network tab and lets the backend skip the filter entirely.
 *
 * `signal` comes from an AbortController: when the customer keeps typing,
 * the page aborts the in-flight request so a slow answer for "pho" can
 * never overwrite the answer for "phone".
 */
export const getProducts = (filters = {}, signal) => {
  const params = {}

  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.category) params.category = filters.category
  if (filters.sort) params.sort = filters.sort

  return api.get('/products', { params, signal })
}

/**
 * GET /products/:id — `id` is the MongoDB _id taken from the route.
 *
 * useParams() hands back a decoded value, so it is encoded again here before
 * going back into a URL; a hand-typed id with odd characters then reaches the
 * backend intact and comes back as a clean 400 instead of a broken request.
 */
export const getProductById = (id, signal) =>
  api.get(`/products/${encodeURIComponent(id)}`, { signal })

/* ---------------- wishlist ---------------- */

/*
 * Every call below is authenticated by the same cookie as the rest of the
 * app, and none of them names a customer. The server reads the identity
 * from the token, so there is no `userId` for the browser to get wrong —
 * or to swap for somebody else's.
 */

/** GET /wishlist — the saved products, already populated for the cards. */
export const getWishlist = (signal) => api.get('/wishlist', { signal })

/**
 * GET /wishlist/ids — the saved ids and nothing else.
 *
 * The product grid needs this to know which hearts are filled, and the
 * navbar needs the count. Neither draws a product, so neither should make
 * the server populate twenty documents to answer.
 */
export const getWishlistIds = (signal) => api.get('/wishlist/ids', { signal })

/**
 * PATCH /wishlist/:id/toggle — flip the saved state in one request.
 *
 * The button could decide for itself and call POST or DELETE, but it would
 * be deciding from a copy of the wishlist that may already be out of date.
 * Sending the intent instead lets the server resolve it against the truth
 * and report back what the state actually is now.
 */
export const toggleWishlist = (productId) =>
  api.patch(`/wishlist/${encodeURIComponent(productId)}/toggle`)

/** DELETE /wishlist/:id — used by the Remove button on the wishlist page. */
export const removeFromWishlist = (productId) =>
  api.delete(`/wishlist/${encodeURIComponent(productId)}`)

/**
 * POST /wishlist/:id — add without toggling.
 *
 * The UI reaches for the toggle above, but this is the endpoint the API
 * contract specifies for a plain add, so the service layer exposes it too.
 */
export const addToWishlist = (productId) =>
  api.post(`/wishlist/${encodeURIComponent(productId)}`)

/* ---------------- cart ---------------- */

/*
 * Every cart write answers with the whole, freshly populated cart. The
 * CartProvider swaps its copy for that answer rather than patching its own
 * guess, which is what keeps the navbar and the cart page in agreement.
 *
 * Only CartProvider should call these. A component that fetched the cart
 * for itself would be holding a second copy that can disagree with the first.
 */

/** GET /cart — rows of { product, quantity }, products already populated. */
export const getCart = (signal) => api.get('/cart', { signal })

/** POST /cart/:id — one more unit (a new row at 1, or +1 on the existing row). */
export const addToCart = (productId) =>
  api.post(`/cart/${encodeURIComponent(productId)}`)

/** PATCH /cart/:id — set the quantity outright; the server checks the stock. */
export const updateCartQuantity = (productId, quantity) =>
  api.patch(`/cart/${encodeURIComponent(productId)}`, { quantity })

/** DELETE /cart/:id — drop the row entirely. */
export const removeFromCart = (productId) =>
  api.delete(`/cart/${encodeURIComponent(productId)}`)

/* ---------------- orders + payment ---------------- */

/**
 * POST /orders/create-payment-order — only the address is sent. The items,
 * prices and total are read from the server's own copy of the cart, so
 * there is nothing here a customer could edit to pay less.
 */
export const createPaymentOrder = (shippingAddress) =>
  api.post('/orders/create-payment-order', { shippingAddress })

/** POST /orders/verify-payment — hands Razorpay's signed response to the server. */
export const verifyPayment = (payload) => api.post('/orders/verify-payment', payload)

/** POST /orders/:id/payment-failed — records a failed attempt. Never clears the cart. */
export const reportPaymentFailed = (orderId) =>
  api.post(`/orders/${encodeURIComponent(orderId)}/payment-failed`)

/** GET /orders — the customer's paid orders, newest first. */
export const getOrders = (signal) => api.get('/orders', { signal })

/** GET /orders/:id — one of the customer's own orders. */
export const getOrderById = (id, signal) =>
  api.get(`/orders/${encodeURIComponent(id)}`, { signal })

/** PATCH /orders/:id/status — bonus dev endpoint that moves an order forward. */
export const advanceOrderStatus = (id, status) =>
  api.patch(`/orders/${encodeURIComponent(id)}/status`, { status })

/** Pulls a readable message out of an axios error, whatever went wrong. */
export const getErrorMessage = (error, fallback = 'Something went wrong') => {
  if (error.response?.data?.message) return error.response.data.message
  if (error.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Is the backend running on port 5000?'
  }
  return error.message || fallback
}

export default api
