const ICONS = {
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  empty: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </>
  ),
  // An empty wishlist or cart is not a failed search, so each gets its own icon.
  heart: (
    <path
      d="M12 20.3s-7.4-4.6-7.4-9.6a4.25 4.25 0 0 1 7.4-2.85 4.25 4.25 0 0 1 7.4 2.85c0 5-7.4 9.6-7.4 9.6Z"
      strokeLinejoin="round"
    />
  ),
  cart: (
    <>
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 8H6" strokeLinejoin="round" />
      <circle cx="10" cy="20" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
}

/**
 * The loading / error / empty panel shared by both product pages.
 *
 * Keeping all three in one component is what guarantees a fetch can never
 * leave a blank screen behind: whatever the request is doing, the page has
 * exactly one of these to render in place of the grid.
 */
export default function StatusBlock({
  variant,
  // `variant` sets the panel's styling; `icon` defaults to it but can be
  // overridden when a page wants different artwork for the same state.
  icon = variant,
  title,
  message,
  children,
}) {
  return (
    <section
      className={`status status--${variant} status--icon-${icon}`}
      /* An error interrupts a screen reader; loading and empty just report. */
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {variant === 'loading' ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        <span className="status__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {ICONS[icon]}
          </svg>
        </span>
      )}

      <h2 className="status__title">{title}</h2>
      {message && <p className="status__message">{message}</p>}
      {children}
    </section>
  )
}
