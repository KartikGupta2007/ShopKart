import { useState } from 'react'

/**
 * A product photo that degrades gracefully.
 *
 * `image` is just a URL string in MongoDB — nothing guarantees it still
 * resolves. Without a fallback a dead link leaves a broken-image icon in the
 * middle of the grid, so we swap in a neutral placeholder instead.
 */
export default function ProductImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className={`product-image product-image--fallback ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="m4 18 5-5 3.5 3.5L16 13l4 4" />
        </svg>
        <span>Image unavailable</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`product-image ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
