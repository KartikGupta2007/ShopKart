/** The fulfilment steps a paid order moves through, in order. */
export const ORDER_STEPS = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED']

const LABELS = {
  PENDING_PAYMENT: 'Awaiting payment',
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
}

export const statusLabel = (status) => LABELS[status] ?? status

/** The step after `status`, or null once delivered (or never paid). */
export const nextStatus = (status) => {
  const index = ORDER_STEPS.indexOf(status)
  return index === -1 ? null : (ORDER_STEPS[index + 1] ?? null)
}

/** "#3f9c1a2b" — the tail of the Mongo id is enough to tell orders apart. */
export const shortOrderId = (id = '') => `#${String(id).slice(-8).toUpperCase()}`

export const formatOrderDate = (value) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(value),
  )
