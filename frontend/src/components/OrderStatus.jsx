import { ORDER_STEPS, statusLabel } from '../utils/orderStatus'

/** A coloured pill for the order's current status. */
export function StatusBadge({ status }) {
  return <span className={`order-badge order-badge--${status.toLowerCase()}`}>{statusLabel(status)}</span>
}

/**
 * Placed → Confirmed → Shipped → Delivered, with every step up to the
 * current one filled in. An unpaid order has no progress to show.
 */
export function StatusTimeline({ status }) {
  const current = ORDER_STEPS.indexOf(status)

  if (current === -1) return null

  return (
    <ol className="timeline" aria-label={`Order status: ${statusLabel(status)}`}>
      {ORDER_STEPS.map((step, index) => (
        <li
          key={step}
          className={`timeline__step${index <= current ? ' timeline__step--done' : ''}`}
          aria-current={index === current ? 'step' : undefined}
        >
          <span className="timeline__dot" aria-hidden="true" />
          <span className="timeline__label">{statusLabel(step)}</span>
        </li>
      ))}
    </ol>
  )
}
