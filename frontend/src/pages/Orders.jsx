import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { StatusBadge } from '../components/OrderStatus'
import StatusBlock from '../components/StatusBlock'
import { getErrorMessage, getOrders } from '../services/api'
import { formatPrice } from '../utils/formatPrice'
import { formatOrderDate, shortOrderId } from '../utils/orderStatus'

/** /orders — every paid order, newest first, read fresh from MongoDB. */
export default function Orders() {
  const [attempt, setAttempt] = useState(0)
  // Tagged with the attempt it answers, so `loading` is derived, not stored.
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    getOrders(controller.signal)
      .then(({ data }) => setResult({ attempt, orders: data.orders, error: '' }))
      .catch((requestError) => {
        if (axios.isCancel(requestError)) return
        setResult({
          attempt,
          orders: [],
          error: getErrorMessage(requestError, 'Please try again in a moment.'),
        })
      })

    return () => controller.abort()
  }, [attempt])

  const loading = result?.attempt !== attempt

  const renderBody = () => {
    if (loading) return <StatusBlock variant="loading" title="Loading your orders..." />

    if (result.error) {
      return (
        <StatusBlock variant="error" title="Unable to load your orders." message={result.error}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setAttempt((current) => current + 1)}
          >
            Try Again
          </button>
        </StatusBlock>
      )
    }

    if (result.orders.length === 0) {
      return (
        <StatusBlock
          variant="empty"
          icon="cart"
          title="You have not placed any orders yet."
          message="Everything you buy will be listed here."
        >
          <Link to="/products" className="btn btn--primary btn--sm">
            Start Shopping
          </Link>
        </StatusBlock>
      )
    }

    return (
      <ul className="orders">
        {result.orders.map((order) => (
          <li key={order._id} className="order-card">
            <div className="order-card__head">
              <div>
                <h2 className="order-card__id">Order {shortOrderId(order._id)}</h2>
                <p className="order-card__date">{formatOrderDate(order.createdAt)}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <ul className="order-card__items">
              {order.items.map((item) => (
                <li key={item.product}>
                  {item.name} <span className="checkout__line-qty">× {item.quantity}</span>
                </li>
              ))}
            </ul>

            <div className="order-card__foot">
              <p className="order-card__total">
                Total: <strong>{formatPrice(order.totalAmount)}</strong>
              </p>
              <Link to={`/orders/${order._id}`} className="btn btn--ghost btn--sm">
                View Details
              </Link>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <header className="catalog__header">
          <p className="catalog__eyebrow">Order history</p>
          <h1 className="catalog__title">My Orders</h1>
          <p className="catalog__subtitle">
            Prices are shown as you paid them, even if the product has changed since.
          </p>
        </header>

        {renderBody()}
      </main>
    </div>
  )
}
