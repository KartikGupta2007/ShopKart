/**
 * Renders a price the way an Indian storefront would: ₹2,999.
 * Intl does the grouping, so we never hand-roll comma placement.
 */
export const formatPrice = (value) => {
  const amount = Number(value)

  if (!Number.isFinite(amount)) return '—'

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    // Whole rupees keep the grid tidy; paise appear only if a product has them.
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}
