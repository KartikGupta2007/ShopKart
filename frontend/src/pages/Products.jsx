import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import ProductCard from '../components/ProductCard'
import SearchBar from '../components/SearchBar'
import StatusBlock from '../components/StatusBlock'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useWishlistIds } from '../hooks/useWishlistIds'
import { getErrorMessage, getProducts } from '../services/api'

const EMPTY_FILTERS = { search: '', category: '', sort: '' }

/**
 * The product listing page.
 *
 * Filtering happens in MongoDB, not here. The alternative — download every
 * product once and filter the array in React — falls apart as soon as the
 * catalogue outgrows a single page: the browser would pull rows it is never
 * going to draw. So each change of filter becomes a new request, and this
 * component only ever holds the rows it is about to render.
 */
export default function Products() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // Which of these products are already saved. Fetched once for the page
  // rather than once per card, and updated in place as hearts are clicked.
  const { isSaved, applyToggle } = useWishlistIds()
  // One object per completed request, tagged with the filters that asked for
  // it. `loading` is then derived rather than stored — which keeps the effect
  // free of the synchronous setState that causes a second render pass.
  const [result, setResult] = useState(null)
  // Bumped by "Try again" so the same filters can be re-requested.
  const [reloadKey, setReloadKey] = useState(0)

  const { category, sort } = filters
  // Typing is debounced; the dropdowns change rarely enough to go straight through.
  const debouncedSearch = useDebouncedValue(filters.search, 400)

  const requestKey = `${debouncedSearch}|${category}|${sort}|${reloadKey}`

  useEffect(() => {
    // A newer request must win. Aborting the previous one stops a slow
    // response for "pho" landing after the response for "phone".
    const controller = new AbortController()

    getProducts({ search: debouncedSearch, category, sort }, controller.signal)
      .then(({ data }) => {
        setResult({ key: requestKey, products: data.products || [], error: '' })
      })
      .catch((requestError) => {
        // Cancelled because newer filters arrived — not a failure. The newer
        // request owns the state now, so leave it alone.
        if (axios.isCancel(requestError)) return

        setResult({
          key: requestKey,
          products: [],
          error: getErrorMessage(requestError, 'Please try again in a moment.'),
        })
      })

    return () => controller.abort()
  }, [requestKey, debouncedSearch, category, sort])

  // Anything the current filters have not answered yet is still in flight.
  const loading = result?.key !== requestKey
  const products = result?.products ?? []
  const error = result?.error ?? ''
  const isFiltered = Boolean(filters.search || filters.category)

  const handleFilterChange = useCallback((patch) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const handleReset = useCallback(() => setFilters(EMPTY_FILTERS), [])

  const handleRetry = useCallback(() => setReloadKey((key) => key + 1), [])

  const renderCatalog = () => {
    if (loading) {
      return <StatusBlock variant="loading" title="Loading products…" />
    }

    if (error) {
      return (
        <StatusBlock
          variant="error"
          title="Something went wrong while loading products."
          message={error}
        >
          <button type="button" className="btn btn--primary btn--sm" onClick={handleRetry}>
            Try again
          </button>
        </StatusBlock>
      )
    }

    if (products.length === 0) {
      return (
        <StatusBlock
          variant="empty"
          title="No products found."
          message={
            isFiltered
              ? 'Nothing matches those filters. Try a different search term or category.'
              : 'The catalogue is empty. Add a product with POST /products to see it here.'
          }
        >
          {isFiltered && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleReset}>
              Clear filters
            </button>
          )}
        </StatusBlock>
      )
    }

    return (
      <>
        <p className="catalog__count">
          {products.length} {products.length === 1 ? 'product' : 'products'}
          {filters.category && ` in ${filters.category}`}
          {debouncedSearch.trim() && ` matching “${debouncedSearch.trim()}”`}
        </p>

        {/* .map() turns the API array into cards — one per document, with no
            hardcoded markup, so the grid always mirrors the database. */}
        <ul className="product-grid">
          {products.map((product) => (
            <li key={product._id}>
              <ProductCard
                product={product}
                saved={isSaved(product._id)}
                onToggled={applyToggle}
              />
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <header className="catalog__header">
          <p className="catalog__eyebrow">Catalogue</p>
          <h1 className="catalog__title">Browse products</h1>
          <p className="catalog__subtitle">
            Search by name, narrow it down by category, then open a product for
            the full details.
          </p>
        </header>

        <SearchBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {renderCatalog()}
      </main>
    </div>
  )
}
