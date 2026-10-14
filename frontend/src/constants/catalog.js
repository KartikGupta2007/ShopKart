/**
 * The category dropdown.
 *
 * An empty `value` means "All Categories", which the service layer turns
 * into *no* `?category=` parameter at all — that is how the backend is told
 * to skip the filter rather than to look for a category literally named "All".
 */
export const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Fashion', label: 'Fashion' },
  { value: 'Books', label: 'Books' },
  { value: 'Home', label: 'Home' },
]

/** Mirrors the ?sort= whitelist in the backend controller. */
export const SORT_OPTIONS = [
  { value: '', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
]

/** At or below this many units the card switches to a warning colour. */
export const LOW_STOCK_THRESHOLD = 5
