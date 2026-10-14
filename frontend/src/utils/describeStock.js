import { LOW_STOCK_THRESHOLD } from '../constants/catalog'

/**
 * One place that decides how a stock count is worded and coloured, so the
 * product card and the details page can never disagree about it.
 */
export const describeStock = (stock) => {
  const units = Number(stock)

  if (!Number.isFinite(units) || units <= 0) {
    return { tone: 'out', label: 'Out of stock', inStock: false }
  }

  // "Only 1 left" avoids the "1 units left" that a plain template would give.
  if (units <= LOW_STOCK_THRESHOLD) {
    return { tone: 'low', label: `Only ${units} left`, inStock: true }
  }

  return { tone: 'in', label: `${units} units left`, inStock: true }
}
