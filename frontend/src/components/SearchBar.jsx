import { CATEGORIES, SORT_OPTIONS } from '../constants/catalog'

/**
 * Search box + category dropdown + price sort.
 *
 * This component holds no state of its own. The listing page owns the
 * filters and re-fetches whenever they change, so the controls stay a thin
 * layer over that state — which is what keeps the URL the backend sees and
 * the values on screen from drifting apart.
 */
export default function SearchBar({ filters, onChange, onReset }) {
  const hasFilters = Boolean(filters.search || filters.category || filters.sort)

  return (
    <form
      className="filters"
      role="search"
      /* Nothing to submit — results arrive as the customer types. */
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="filters__search">
        <svg
          className="filters__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>

        <input
          id="product-search"
          type="search"
          className="filters__input"
          placeholder="Search products..."
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          aria-label="Search products by name"
        />
      </div>

      <div className="filters__group">
        <label className="filters__field">
          <span className="filters__label">Category</span>
          <select
            className="filters__select"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
          >
            {CATEGORIES.map((category) => (
              <option key={category.label} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filters__field">
          <span className="filters__label">Sort by</span>
          <select
            className="filters__select"
            value={filters.sort}
            onChange={(event) => onChange({ sort: event.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn btn--ghost btn--sm filters__reset"
          onClick={onReset}
          disabled={!hasFilters}
        >
          Clear
        </button>
      </div>
    </form>
  )
}
