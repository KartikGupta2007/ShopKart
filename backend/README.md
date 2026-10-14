# ShopKart — Backend

Node.js + Express + MongoDB/Mongoose. Two features so far:

- **Customer authentication** (Lab 01) — bcrypt + jsonwebtoken + cookie-parser,
  no auth framework (no Passport / Clerk / Firebase / Auth0).
- **Product catalogue** (Lab 03) — CRUD-lite product APIs with search, category
  filtering and price sorting driven entirely by query parameters.

## Setup

```bash
cd backend
npm install
# copy .env.example to .env and fill in your values
npm run dev
```

Server runs on `http://localhost:5000`.

### .env

| Key | Meaning |
|-----|---------|
| `PORT` | server port (default 5000) |
| `NODE_ENV` | `development` / `production` — controls the cookie `secure` flag |
| `MONGO_URI` | e.g. `mongodb://127.0.0.1:27017/shopkart` or an Atlas URI |
| `JWT_SECRET` | long random string used to sign tokens |
| `JWT_EXPIRES_IN` | token lifetime, e.g. `7d` |
| `CORS_ORIGIN` | frontend origin (Vite default `http://localhost:5173`) |
| `DB_NAME` | database name appended to `MONGO_URI` |

### Seeding the catalogue

```bash
npm run seed
```

Replaces every product with a 20-item demo catalogue across four categories,
including three low-stock items and one sold-out product so each UI state
has something to render. Development only — it deletes what is already there.

## Folder structure

```text
backend/
├── src/
│   ├── config/
│   │   └── db.js                     MongoDB connection
│   ├── controllers/
│   │   ├── customer.controller.js    request handling / business logic
│   │   ├── product.controller.js     catalogue queries + validation
│   │   ├── wishlist.controller.js    saved products (Lab 04)
│   │   └── cart.controller.js        cart + stock rules (Lab 05)
│   ├── models/
│   │   ├── customer.model.js         schema + bcrypt hook + helpers
│   │   └── product.model.js          product schema + validation
│   ├── routes/
│   │   ├── customer.routes.js        endpoint -> controller mapping
│   │   ├── product.routes.js
│   │   ├── wishlist.routes.js
│   │   └── cart.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js        JWT cookie verification (protect)
│   │   └── error.middleware.js       404 + central error handler
│   ├── utils/
│   │   ├── generateToken.js          JWT signing + cookie helpers
│   │   ├── ApiError.js               error class + asyncHandler
│   │   ├── escapeRegex.js            makes search text safe inside $regex
│   │   └── seedProducts.js           demo catalogue (npm run seed)
│   ├── app.js                        express app + middleware wiring
│   └── server.js                     entry point (connect DB, listen)
├── .env
└── package.json
```

## API

| Method | Endpoint | Protected |
|--------|----------|-----------|
| POST | `/customers/register` | ❌ |
| POST | `/customers/login` | ❌ |
| GET | `/customers/me` | ✅ |
| POST | `/customers/logout` | ✅ |
| PATCH | `/customers/change-password` | ✅ (bonus) |
| POST | `/products` | ❌ |
| GET | `/products` | ❌ |
| GET | `/products/:id` | ❌ |
| POST | `/cart/:productId` | ✅ |
| GET | `/cart` | ✅ |
| PATCH | `/cart/:productId` | ✅ |
| DELETE | `/cart/:productId` | ✅ |

Product creation stays open for this lab; admin-only authorization arrives in a
later lab.

## Customer auth (Lab 01)

### POST /customers/register

```json
{ "fullName": "John Doe", "email": "john@gmail.com", "password": "john123", "phone": "9876543210" }
```

`201` →

```json
{
  "success": true,
  "message": "Customer registered successfully",
  "customer": { "_id": "...", "fullName": "John Doe", "email": "john@gmail.com", "phone": "9876543210" }
}
```

| Situation | Status |
|-----------|--------|
| Missing field | 400 |
| Password shorter than 6 characters | 400 |
| Email already exists | 409 |

### POST /customers/login

```json
{ "email": "john@gmail.com", "password": "john123" }
```

`200` → `{ "success": true, "message": "Login successful", "customer": { ... } }`
and a `Set-Cookie: token=...; HttpOnly; SameSite=Strict` header.

Wrong email **or** wrong password both return `401 Invalid credentials` — the response
never tells an attacker which of the two was wrong.

### GET /customers/me

Requires the `token` cookie. `200` →

```json
{ "_id": "...", "fullName": "John Doe", "email": "john@gmail.com", "phone": "9876543210" }
```

Missing / invalid / expired token → `401`.

### POST /customers/logout

Clears the cookie → `{ "success": true, "message": "Logged out successfully" }`.

### PATCH /customers/change-password (bonus)

```json
{ "oldPassword": "john123", "newPassword": "john456" }
```

Verifies the old password, re-hashes the new one, and clears the cookie so the
old token cannot keep the session alive. Wrong old password → `401`.

## Products (Lab 03)

### The Product schema

| Field | Type | Validation |
|-------|------|------------|
| `name` | String | required, trimmed, min 2 chars |
| `description` | String | required, trimmed |
| `price` | Number | required, **strictly greater than 0** |
| `category` | String | required, trimmed |
| `image` | String | required, trimmed (a URL) |
| `stock` | Number | required, integer, minimum 0 |
| `createdAt` | Date | automatic (`timestamps: true`) |

`price` uses a custom validator rather than `min: 0`, because Mongoose's `min`
is inclusive and would let a ₹0 product through. `stock` does use `min: 0` —
zero stock is legitimate, it just means sold out.

`timestamps: true` also adds `updatedAt`; a `toJSON` transform drops that and
`__v` so responses only carry fields the UI has a use for.

### POST /products

```json
{
  "name": "Mechanical Keyboard",
  "description": "RGB mechanical keyboard with blue switches.",
  "price": 2999,
  "category": "Electronics",
  "image": "https://example.com/keyboard.jpg",
  "stock": 10
}
```

`201` →

```json
{
  "success": true,
  "message": "Product created successfully",
  "product": { "_id": "...", "name": "Mechanical Keyboard", "createdAt": "...", "...": "..." }
}
```

| Situation | Status |
|-----------|--------|
| Missing required field | 400 |
| `price` is 0, negative or not a number | 400 |
| `stock` is negative or fractional | 400 |

Numbers arriving as strings (`"price": "2999"`) are coerced before validation,
because a JSON body is free to send either.

### GET /products

```json
{
  "success": true,
  "count": 2,
  "products": [
    {
      "_id": "...",
      "name": "Mechanical Keyboard",
      "price": 2999,
      "category": "Electronics",
      "image": "https://example.com/keyboard.jpg",
      "stock": 10
    }
  ]
}
```

The list deliberately omits `description`: the grid does not draw it, and the
details page fetches it from `GET /products/:id` when it actually needs it.

#### Query parameters

| Parameter | Effect |
|-----------|--------|
| `search` | products whose **name contains** the text, case-insensitive |
| `category` | exact category match, case-insensitive |
| `sort` | `price_asc`, `price_desc`, `newest` (default), `oldest` |

```text
/products?search=keyboard
/products?category=Electronics
/products?search=keyboard&category=Electronics
/products?category=Electronics&sort=price_asc
```

All three combine. The controller builds **one** MongoDB filter object from
whichever parameters arrived, rather than exposing a separate endpoint per
filter — so adding a filter later means adding an `if`, not a route.

An unrecognised `sort` value returns `400` with the list of accepted values,
and `sort` is resolved through a whitelist so a client can never inject an
arbitrary key into `.sort()`.

Search text is escaped before it goes into `$regex` (see `utils/escapeRegex.js`).
Without that, searching for `c++` or `(` would either throw a malformed-regex
error or silently match the wrong rows, and `.*` would match everything.

### GET /products/:id

`200` → `{ "success": true, "product": { ...including description and createdAt } }`

| Situation | Status |
|-----------|--------|
| `id` is not a valid ObjectId | 400 |
| No product with that id | 404 |

The id's *shape* is checked before the query runs, so a typo'd URL is reported
as the caller's mistake (400) rather than as a missing product (404).

## Cart (Lab 05)

Each customer document holds `cart: [{ product, quantity }]` — a Product
**reference** plus a quantity (whole number, min 1). No price, name or subtotal
is copied in: those are read from the Product collection on every request, so a
price change shows up everywhere at once and nothing can go stale. Accounts
created before this lab read back with `cart: []`, no migration needed.

Every route is behind `protect` and takes no user id — the customer comes from
the JWT. Every response returns the whole populated cart:

```json
{ "success": true, "message": "Cart updated", "cart": [{ "product": { "_id": "…", "name": "Mechanical Keyboard", "price": 2999, "image": "…", "stock": 10, "category": "Electronics" }, "quantity": 2 }] }
```

| Endpoint | Does | Errors |
|---|---|---|
| `POST /cart/:productId` | New row at 1, or +1 on the existing row | 400 bad id · 404 no product · 400 out of stock / already at stock |
| `GET /cart` | Rows with products populated, newest first | 401 |
| `PATCH /cart/:productId` `{ "quantity": 3 }` | Sets the quantity outright | 400 bad id / not a whole number / < 1 / > stock · 404 no product / not in cart |
| `DELETE /cart/:productId` | Removes the row | 400 bad id · 404 not in cart |

**Stock is checked inside the update, not before it.** POST uses
`$elemMatch: { product, quantity: { $lt: stock } }` + `$inc`, and pushes a new
row only when `"cart.product": { $ne: productId }`. A JavaScript "read, check,
save" would let two quick clicks both pass the check; here MongoDB applies the
rule and the write together (12 parallel adds against 6 remaining units → exactly
6 succeed). PATCH checks against the stock *now*, so a product that sold down
since it was added cannot be raised past what is left.

## Testing in Postman

Import `ShopKart.postman_collection.json`. It has two folders.

**Customer Auth (Lab 01).** Turn on cookie handling (it is on by default) —
Postman stores the `token` cookie from login and sends it automatically to
`/customers/me`, `/customers/logout` and `/customers/change-password`.
Suggested order: register → login → me → change-password → login (new password)
→ logout → me (expect 401).

**Products (Lab 03).** Run *1. Create Product* first: a test script on that
request saves the new `_id` into the `{{productId}}` collection variable, so the
`GET /products/:id` requests further down work without pasting an id by hand.
Then work through the list — creates (including the 400 cases), the filters, the
single-product lookups and the bonus sorting.

**Cart (Lab 05).** Needs `{{productId}}` (from *Create Product*, or paste a
seeded product's `_id`) and a registered account in *0. Login*. Run top to
bottom: add → add again (qty 2) → get → patch → the 400/404 cases → remove →
logout → get (401). Each request has a test script checking the status/quantity.

## Security notes (viva)

**Why bcrypt instead of encryption?** Encryption is two-way — anyone with the key
can get the original password back. Hashing is one-way, so a stolen database gives
no passwords. bcrypt additionally salts every hash (so two users with the same
password get different hashes, defeating rainbow tables) and is deliberately slow
via a cost factor, which makes brute-forcing expensive. We never need the original
password, only to check a guess — so hashing is the right tool.

**What goes in a JWT payload?** Only non-sensitive identifying data — here just the
customer `_id`, plus `iat` and `exp` added by the library. A JWT is signed, not
encrypted: the payload is base64, so anyone holding the token can read it. Never
put passwords or secrets there.

**Why HttpOnly?** An HttpOnly cookie is invisible to `document.cookie`, so if an
XSS bug injects a script on the page it still cannot steal the token. A token in
`localStorage` has no such protection. `SameSite=Strict` and `secure` (in production)
add CSRF and transport protection on top.

**Why never return the password?** Even a hash is an offline brute-force target and
has no legitimate use in the frontend. Here the schema marks `password` as
`select: false`, a `toJSON` transform strips it, and every response is built from
`toPublicJSON()` — three layers so it cannot leak by accident.

**What is auth middleware for?** It keeps the "is this request authenticated" check
in exactly one place instead of repeating it in every controller. It reads the
cookie, verifies the signature and expiry, loads the customer from MongoDB (so a
deleted account is rejected even with a valid token), attaches it to `req.user`,
and calls `next()`. Any route can then be protected by adding `protect` in front
of it.

### Products (viva)

**Why keep products in MongoDB instead of hardcoding them in React?** The
catalogue is data, not markup. In the database one product is one document that
any client can read, an admin can change without a redeploy, and the server can
filter, sort and paginate. Hardcoded in a component it is duplicated per client,
needs a rebuild to change a price, and cannot be queried at all.

**URL parameter vs query parameter.** A URL parameter is part of the path and
identifies *which* resource — `/products/:id` names one product, and a different
id is a different page. A query parameter modifies a request against a
collection that exists either way — `/products?category=Electronics` is still
the product list, just narrowed. So identity goes in the path, filters go in the
query string.

**Why filter on the server?** `GET /products?search=phone` makes MongoDB do the
work and sends back only the matching rows. Fetching everything and filtering in
React means downloading the whole catalogue on every visit — fine for 20
products, ruinous at 20,000 — and it puts the filtering rules in the client
where each new client has to reimplement them.

**What happens on an empty result?** Nothing exceptional: `200` with
`count: 0` and `products: []`. "No products match this filter" is a successful
answer to a valid question, so it is not a 404 — the *collection* exists. Only
`GET /products/:id` can 404, because there the missing thing is the resource
being addressed.
