import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getWishlistIds } from '../services/api'
import { onWishlistChange } from '../services/wishlistEvents'

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [wishlistCount, setWishlistCount] = useState(0)
  // Read from the shared cart state, not fetched here. Every add, +, − and
  // Remove anywhere in the app changes that state, so the badge follows
  // without a refresh — and it is the same number the cart page shows.
  // Total units, not rows: Keyboard × 2 + Mouse × 1 reads Cart (3).
  const { totalUnits } = useCart()

  /**
   * The badge is read from the server, never counted in the browser.
   *
   * It reloads on mount and again whenever a heart anywhere announces a
   * change, which is how a click on the products page reaches a navbar
   * that is not its parent. See services/wishlistEvents.
   */
  useEffect(() => {
    // Nothing to count, and the nav links are not rendered logged out —
    // so a stale value cannot be on screen, and clearing it here would
    // only cost a second render.
    if (!user) return

    const controller = new AbortController()

    const load = () =>
      getWishlistIds(controller.signal)
        .then(({ data }) => setWishlistCount(data.count))
        // A badge that fails to load is not worth interrupting anyone over;
        // the wishlist page itself reports properly if the API is down.
        .catch(() => {})

    load()

    const stopListening = onWishlistChange(load)

    return () => {
      controller.abort()
      stopListening()
    }
  }, [user])

  const handleLogout = async () => {
    setLoggingOut(true)
    // logout() clears the cookie on the server and the user in context.
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to={user ? '/home' : '/login'} className="brand">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" />
              <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
              <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="brand__name">
            Shop<span className="brand__accent">Kart</span>
          </span>
        </Link>

        {user && (
          <nav className="navbar__nav">
            <NavLink to="/home" className="navbar__link">
              Home
            </NavLink>
            {/* Stays highlighted on /products/:id too, since NavLink
                matches nested paths unless you pass `end`. */}
            <NavLink to="/products" className="navbar__link">
              Products
            </NavLink>
            <NavLink to="/wishlist" className="navbar__link">
              Wishlist
              {wishlistCount > 0 && (
                <span className="navbar__count">{wishlistCount}</span>
              )}
            </NavLink>
            <NavLink to="/cart" className="navbar__link">
              Cart
              {totalUnits > 0 && (
                <span className="navbar__count" aria-label={`${totalUnits} in cart`}>
                  {totalUnits}
                </span>
              )}
            </NavLink>
            <NavLink to="/orders" className="navbar__link">
              Orders
            </NavLink>
          </nav>
        )}

        <nav className="navbar__actions">
          {user ? (
            <>
              <span className="avatar" title={user.fullName}>
                {getInitials(user.fullName)}
              </span>
              <span className="navbar__greeting">
                Hi, {user.fullName.split(' ')[0]}
              </span>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Logging out…' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="navbar__link">
                Login
              </NavLink>
              <NavLink to="/register" className="btn btn--primary btn--sm">
                Create account
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
