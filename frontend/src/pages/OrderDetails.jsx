import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { StatusBadge, StatusTimeline } from '../components/OrderStatus'
import ProductImage from '../components/ProductImage'
import StatusBlock from '../components/StatusBlock'
import { advanceOrderStatus, getErrorMessage, getOrderById } from '../services/api'
import { formatPrice } from '../utils/formatPrice'
import { formatOrderDate, nextStatus, shortOrderId, statusLabel } from '../utils/orderStatus'

/**
 * One order, read from the server by id. Mounted twice:
 *   /orders/:id         — from My Orders
 *   /order-success/:id  — straight after payment, with the success banner
 *
 * The success page loads the order too rather than trusting what the
 * checkout page passed along, so a refresh still shows the real record.
 */
export default function OrderDetails({ success = false }) {
  const { id } = useParams()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [advancing, setAdvancing] = useState(false)
  const [advanceError, setAdvanceError] = useState('')

  const key = `${id}|${attempt}`

  useEffect(() => {
    const controller = new AbortController()

    getOrderById(id, controller.signal)
      .then(({ data }) => setResult({ key, order: data.order, error: '' }))
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return
        setResult({
          key,
          order: null,
          error: getErrorMessage(requestError, 'Please try again in a moment.'),
        })
      })

    return () => controller.abort()
  }, [id, key])

  const loading = result?.key !== key
  const order = loading ? null : result.order

  // Bonus: stand-in for an admin moving the order along.
  const handleAdvance = async () => {
    const next = nextStatus(order.status)
    if (!next) return

    setAdvancing(true)
    setAdvanceError('')

    try {
      const { data } = await advanceOrderStatus(order._id, next)
      setResult({ key, order: data.order, error: '' })
    } catch (requestError) {
      setAdvanceError(getErrorMessage(requestError, 'Could not update the status.'))
    } finally {
      setAdvancing(false)
    }
  }

  const renderBody = () => {
    if (loading) return <StatusBlock variant="loading" title="Loading your order..." />

    if (result.error) {
      return (
        <StatusBlock variant="error" title="Unable to load this order." message={result.error}>
          <Link to="/orders" className="btn btn--primary btn--sm">
            View My Orders
          </Link>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Try Again
          </button>
        </StatusBlock>
      )
    }

    const { shippingAddress: address } = order
    const paid = order.paymentStatus === 'PAID'
    const next = nextStatus(order.status)

    return (
      <div className="order-detail">
        {success && paid && (
          <section className="order-success" role="status">
            <span className="order-success__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h2 className="order-success__title">Order Placed Successfully</h2>
              <p className="order-success__text">
                Your payment was verified and your order has been saved.
              </p>
            </div>
          </section>
        )}

        <section className="card order-detail__card">
          <dl className="order-detail__meta">
            <div>
              <dt>Order ID</dt>
              <dd className="profile__id">{order._id}</dd>
            </div>
            <div>
              <dt>Placed on</dt>
              <dd>{formatOrderDate(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>{order.paymentStatus}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={order.status} />
              </dd>
            </div>
          </dl>

          <StatusTimeline status={order.status} />

          {paid && next && (
            <div className="order-detail__dev">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={handleAdvance}
                disabled={advancing}
              >
                {advancing ? 'Updating…' : `Dev: mark as ${statusLabel(next)}`}
              </button>
              {advanceError && <span className="summary__warning">{advanceError}</span>}
            </div>
          )}
        </section>

        <div className="order-detail__grid">
          <section className="card">
            <h2 className="checkout__heading">Items</h2>
            <ul className="order-lines">
              {order.items.map((item) => (
                <li key={item.product} className="order-line">
                  <ProductImage src={item.image} alt={item.name} className="order-line__image" />
                  <div className="order-line__info">
                    <p className="order-line__name">{item.name}</p>
                    <p className="order-line__meta">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="order-line__total">{formatPrice(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <p className="order-detail__total">
              <span>Total</span>
              <strong>{formatPrice(order.totalAmount)}</strong>
            </p>
          </section>

          <section className="card">
            <h2 className="checkout__heading">Delivering to</h2>
            <address className="order-detail__address">
              <strong>{address.fullName}</strong>
              <br />
              {address.addressLine1}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              Phone: {address.phone}
            </address>
          </section>
        </div>

        <div className="order-detail__actions">
          <Link to="/orders" className="btn btn--primary">
            View My Orders
          </Link>
          <Link to="/products" className="btn btn--ghost">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <header className="catalog__header">
          <p className="catalog__eyebrow">{success ? 'Thank you' : 'Order details'}</p>
          <h1 className="catalog__title">Order {shortOrderId(id)}</h1>
        </header>

        {renderBody()}
      </main>
    </div>
  )
}
