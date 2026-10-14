# ShopKart — Frontend

React + React Router DOM + Axios + plain CSS.
No Firebase / Clerk / Auth0 / Redux — session state lives in a small React Context.

- **Lab 02** — register → login → protected home, session in an HttpOnly cookie.
- **Lab 03** — product discovery: listing, search, category filter, price sort
  and a details page, all driven by the backend.

Talks to the backend in [`../backend`](../backend).

## Setup

```bash
# terminal 1 — backend must be running first
cd backend
npm run seed         # optional: fill the catalogue with 20 demo products
npm run dev          # http://localhost:5000

# terminal 2
cd frontend
npm install
npm run dev          # http://localhost:5173
```

`.env` holds `VITE_API_URL=http://localhost:5000`. Vite only exposes variables
prefixed with `VITE_`. Change it if your backend runs on another port — and keep
the backend's `CORS_ORIGIN` pointing back at the frontend, or the browser will
block every request.

## Folder structure

```text
src/
├── components/
│   ├── AuthLayout.jsx      split screen shared by login + register
│   ├── FormField.jsx       labelled controlled input + error message
│   ├── Loader.jsx          full-screen spinner for the session check
│   ├── Navbar.jsx          brand, section links, greeting, logout
│   ├── ProductCard.jsx     one product in the grid
│   ├── ProductImage.jsx    product photo + dead-URL fallback
│   ├── ProtectedRoute.jsx  guards /home and /products
│   ├── PublicRoute.jsx     keeps logged-in users off /login and /register
│   ├── SearchBar.jsx       search box + category + sort controls
│   └── StatusBlock.jsx     the loading / error / empty panel
├── constants/
│   └── catalog.js          category + sort dropdown options
├── context/
│   ├── AuthContext.js      the context + useAuth hook
│   └── AuthProvider.jsx    holds the customer, calls login/logout/refresh
├── hooks/
│   └── useDebouncedValue.js  delays the search term until typing stops
├── pages/
│   ├── Home.jsx            protected profile page
│   ├── Login.jsx
│   ├── NotFound.jsx
│   ├── ProductDetails.jsx  /products/:id
│   ├── Products.jsx        listing + search + filter
│   └── Register.jsx
├── services/
│   └── api.js              axios instance + every API call
├── utils/
│   ├── describeStock.js    stock count -> wording + colour
│   └── formatPrice.js      number -> ₹2,999
├── App.jsx                 routes
├── App.css                 page + component styles
├── index.css               design tokens, reset, buttons
└── main.jsx                BrowserRouter + AuthProvider
```

## Routes

| Route | Page | Access |
|-------|------|--------|
| `/` | redirect | → `/home` |
| `/register` | Register | logged out only |
| `/login` | Login | logged out only |
| `/home` | Home | **protected** |
| `/products` | Product listing | **protected** |
| `/products/:id` | Product details | **protected** |
| `*` | 404 | anyone |

## How the flow works

1. **Register** (`POST /customers/register`) — four controlled inputs, validated
   on the client against the same rules the backend enforces. On success it
   redirects to `/login` with a "Account created" banner and the email prefilled.
   A `409` from the server is shown on the email field as "Email already registered".
2. **Login** (`POST /customers/login`) — on success the browser stores the
   HttpOnly cookie the server set, then `AuthProvider` calls `/customers/me` to
   fill the context and the app navigates to `/home`. A `401` shows
   **Invalid Credentials** — the same message for a wrong email or a wrong
   password, matching the backend.
3. **Home** (`GET /customers/me`) — `ProtectedRoute` waits for the session check,
   then either renders the page or redirects to `/login`.
4. **Logout** (`POST /customers/logout`) — the navbar button clears the cookie
   server-side, drops the user from context, and navigates to `/login`.

On a page refresh `AuthProvider` re-runs `/customers/me` once. Until that call
returns, protected routes show a loader rather than redirecting — otherwise a
logged-in customer would be bounced to `/login` on every refresh.

## Product discovery (Lab 03)

```text
/products  ──click View Details──▶  /products/:id
```

### How the listing page works

`Products.jsx` holds the three filters in one piece of state:

```js
const [filters, setFilters] = useState({ search: '', category: '', sort: '' })
```

Every change to them becomes a new request, and the backend does the filtering:

```text
customer types "phone"
        ↓
setFilters({ search: 'phone' })      ← React state
        ↓  (400 ms debounce)
GET /products?search=phone           ← services/api.js
        ↓
MongoDB filters the collection
        ↓
setResult({ products: [...] }) → .map() → cards
```

Three details are worth pointing at:

**Filtering is the server's job.** The alternative — fetch all products once and
`.filter()` the array in React — means the browser downloads rows it will never
draw. Fine at 20 products, hopeless at 20,000. It also duplicates the matching
rules in every client.

**Typing is debounced.** `useDebouncedValue` holds the search term back until
the customer stops typing for 400 ms, so "phone" fires one request instead of
five. The input itself stays fully controlled and instant — only the value that
*triggers the fetch* lags behind.

**A newer request always wins.** Each fetch gets an `AbortController`, and the
effect's cleanup aborts the previous one. Without that, a slow response for
`pho` could land after the response for `phone` and overwrite the results with
stale rows. An aborted request is not an error, so `axios.isCancel(err)` returns
early rather than showing the error panel.

`loading` is *derived*, not stored: each completed request is tagged with the
filters that asked for it, and anything the current filters have not answered
yet is still in flight.

```js
const requestKey = `${debouncedSearch}|${category}|${sort}|${reloadKey}`
const loading = result?.key !== requestKey
```

That keeps the effect free of a synchronous `setState`, which React 19 flags as
a cascading render.

### The details page

`/products/:id` reads its id straight out of the URL:

```js
const { id } = useParams()      // URL parameter
```

A URL parameter identifies *which* product, so it belongs in the path. The
listing page's filters are query parameters instead, because they only narrow a
collection that exists either way. Changing `:id` is a different page; changing
`?category=` is the same page, filtered.

The page asks for the full document (`GET /products/:id`) because it needs the
`description`, which the list endpoint deliberately leaves out.

A `400` (malformed id) and a `404` (no such product) both render **"Product not
found."** — to someone following a stale link they are the same story.

**Add to Cart** is UI only in this lab. Clicking it shows a note; the cart
itself arrives in Lab 04.

### The three states

Every fetch renders exactly one of these, so the screen is never blank:

| State | What the customer sees |
|-------|------------------------|
| Loading | spinner + "Loading products…" |
| Error | "Something went wrong while loading products." + the reason + **Try again** |
| Empty | "No products found." + **Clear filters** when a filter caused it |

All three come from one component, `StatusBlock.jsx`. Keeping them together is
what guarantees they stay consistent and that no page forgets one.

The empty state distinguishes *no matches for these filters* from *the catalogue
is empty* — the first is fixed by clearing filters, the second by adding a
product.

## Shopping cart (Lab 05)

### One shared cart state

`context/CartProvider.jsx` (Context API, mounted inside `AuthProvider`) is the
only place the browser holds the cart. The product card, details page, navbar
badge, cart page and order summary all read `useCart()`; none of them fetches
the cart. It exposes `cartItems`, `loading`, `error`, per-product `pending` and
`itemErrors`, the derived totals, and `addToCart`, `updateQuantity`,
`removeFromCart`, `refreshCart`.

- **Server state, mirrored.** The cart lives in MongoDB. The provider loads it
  when a user logs in (and drops it on logout), and after every write it
  replaces its copy with the cart the API sent back — it never computes a new
  cart itself. That is why the navbar and the cart page cannot disagree.
- **Derived, never stored.** `utils/cartTotals.js` computes `itemCount`,
  `totalUnits` (the navbar number — Keyboard × 2 + Mouse × 1 = Cart (3)) and
  `subtotal = Σ price × quantity` from the rows on every render.
- **Per-item loading.** `pending` is keyed by product id, so `+` on one row
  disables that row only. Add to Cart shows *Adding…* until the server answers.
- **Optimistic quantity / remove.** The number changes immediately; on failure
  that one row is rolled back, the server's message is shown under it, and the
  cart is re-read. Out-of-order responses are dropped with a ticket counter.
- **Latest price and stock.** Opening `/cart` re-reads the cart in the
  background. A row whose quantity now exceeds stock is flagged, `−` drops it
  straight to the stock, and *Proceed to Checkout* is disabled until fixed.

### Pages and components

| File | Role |
|---|---|
| `pages/Cart.jsx` | `/cart` — rows, Order Summary, loading / empty / error states |
| `components/CartItem.jsx` | One row: image, price, `[-] qty [+]`, line total, Remove |
| `components/AddToCartButton.jsx` | Add to Cart / Adding… / Add Another / Max quantity in cart |
| `context/CartContext.js` + `CartProvider.jsx` | The shared cart state |

`−` is disabled at 1 (use Remove), `+` is disabled at the stock limit, and the
server enforces both anyway.

## Answers to the viva questions

**1. Why `withCredentials: true`?**
By default the browser does not attach cookies to cross-origin requests, and
`localhost:5173` and `localhost:5000` are different origins. Without this flag
the login response's `Set-Cookie` is discarded and `/customers/me` arrives with
no cookie, so it always returns 401. The server side of the same deal is
`Access-Control-Allow-Credentials: true` (`cors({ credentials: true })` in the
backend) — and with credentials on, the allowed origin must be an explicit URL,
never `*`.

**2. Why can't JavaScript read an HttpOnly cookie?**
`HttpOnly` tells the browser to expose the cookie only when it builds an HTTP
request — it is deliberately left out of `document.cookie` and the DevTools JS
API. That is the point: if an XSS bug injects a script into the page, the script
still cannot read or exfiltrate the token. A token kept in `localStorage` has no
such protection. The trade-off is that our code cannot inspect the token, which
is why we ask the server who we are instead.

**3. Why is `/home` a "protected route"?**
Because it renders only for an authenticated customer. `ProtectedRoute` checks
the session before rendering and redirects to `/login` when there is none. Note
this is a UX guard, not a security boundary — anyone can edit the JavaScript in
their own browser. The real protection is the backend's `protect` middleware:
`/customers/me` returns 401 without a valid token no matter what the frontend does.

**4. Why fetch `/customers/me` instead of storing the user manually?**
The server is the only thing that can be trusted. A copy in `localStorage` goes
stale the moment the account changes or the token expires, it survives a logout
in another tab, and the user can simply edit it to whatever they like. Since the
token is HttpOnly we cannot read it anyway, so asking the server is also the only
way to know whether the session is still valid. One request on mount gives an
answer that is always current.

**5. Authentication vs authorization.**
Authentication is *who are you* — proving identity, which is what login, the JWT
and `/customers/me` do here. Authorization is *what are you allowed to do* —
checking permissions once identity is known, e.g. only an admin may delete a
product, or a customer may only see their own orders. You authenticate first,
then authorize. This lab is entirely authentication; authorization arrives with
roles in the later labs.

**6. How does `.map()` help render products dynamically?**
`products.map(p => <ProductCard key={p._id} product={p} />)` turns an array of
documents into an array of elements, which JSX renders in order. The markup is
written once and the count comes from the data, so twenty products and two
products use the same code and the grid always mirrors the database. The `key`
is the product's `_id` — a stable identity that lets React match elements across
re-renders instead of rebuilding the whole list.

**7. Why do we need loading and error states?**
Because a network request takes time and can fail, and those are the two things
a component cannot know synchronously. With no loading state the customer stares
at an empty page and cannot tell whether it is working, broken or genuinely
empty. With no error state a failure looks exactly like an empty catalogue. Each
state answers a different question — *wait*, *retry*, *change your filters* — so
each needs its own message.

**8. Why separate API logic from UI components?**
`services/api.js` owns the base URL, `withCredentials`, and how each endpoint is
shaped; the components just call `getProducts(filters)`. So the backend moving
to a new port or the list gaining a parameter is a one-file change instead of a
hunt through every page. The components stay about rendering, which also makes
them far easier to reason about — `ProductCard` takes a product and draws it,
and does not care where it came from.
