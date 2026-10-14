import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import FormField from '../components/FormField'
import Navbar from '../components/Navbar'
import StatusBlock from '../components/StatusBlock'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import {
  createPaymentOrder,
  getErrorMessage,
  reportPaymentFailed,
  verifyPayment,
} from '../services/api'
import { exceedsStock } from '../utils/cartTotals'
import { formatPrice } from '../utils/formatPrice'
import { loadRazorpay } from '../utils/loadRazorpay'

const FIELDS = [
  { name: 'fullName', label: 'Full name', placeholder: 'Aarav Sharma', autoComplete: 'name' },
  {
    name: 'phone',
    label: 'Phone number',
    type: 'tel',
    placeholder: '9876543210',
    autoComplete: 'tel',
    inputMode: 'numeric',
    maxLength: 10,
  },
  {
    name: 'addressLine1',
    label: 'Address',
    placeholder: 'House no., street, area',
    autoComplete: 'address-line1',
  },
  { name: 'city', label: 'City', placeholder: 'Bengaluru', autoComplete: 'address-level2' },
  { name: 'state', label: 'State', placeholder: 'Karnataka', autoComplete: 'address-level1' },
  {
    name: 'pincode',
    label: 'Pincode',
    placeholder: '560001',
    autoComplete: 'postal-code',
    inputMode: 'numeric',
    maxLength: 6,
  },
]

const REQUIRED = {
  fullName: 'Full name is required',
  phone: 'Phone number is required',
  addressLine1: 'Address is required',
  city: 'City is required',
  state: 'State is required',
  pincode: 'Pincode is required',
}

/**
 * The same rules the server applies, checked first so a typo never costs a
 * round trip. The server checks again — this is for the customer, not security.
 */
const validate = (form) => {
  const errors = {}

  // trim() makes whitespace-only input count as empty.
  for (const [field, message] of Object.entries(REQUIRED)) {
    if (!form[field].trim()) errors[field] = message
  }

  if (!errors.fullName && form.fullName.trim().length < 3)
    errors.fullName = 'Full name must be at least 3 characters'

  if (!errors.phone && !/^[6-9][0-9]{9}$/.test(form.phone.trim()))
    errors.phone = 'Enter a valid 10-digit mobile number'

  if (!errors.pincode && !/^[0-9]{6}$/.test(form.pincode.trim()))
    errors.pincode = 'Pincode must contain 6 digits.'

  return errors
}

const trimAll = (form) =>
  Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))

/**
 * /checkout — shipping form, final review, then Razorpay.
 *
 *   1. validate the form in the browser
 *   2. POST the address; the server re-checks stock, prices the cart itself
 *      and returns a Razorpay order for that amount
 *   3. open Razorpay Checkout
 *   4. hand Razorpay's signed response to the server to verify
 *   5. only after that succeeds: empty the local cart, go to the success page
 *
 * The cart is never cleared here on a guess — a closed popup or a failed
 * payment leaves it exactly as it was.
 */
export default function Checkout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { cartItems, loading, error, subtotal, totalUnits, refreshCart, clearCart } = useCart()

  const [form, setForm] = useState(() => ({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    addressLine1: '',
    city: '',
    state: '',
    pincode: '',
  }))
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  // idle → creating (talking to our API) → paying (Razorpay open) → verifying
  const [phase, setPhase] = useState('idle')

  // The summary should show today's prices and stock, not the ones from
  // when the cart was first loaded.
  useEffect(() => {
    refreshCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const busy = phase !== 'idle'
  const blocked = cartItems.some(exceedsStock)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setServerError('')
  }

  const failPayment = (orderId, message) => {
    // Best effort: marks the attempt FAILED. The cart is untouched either way.
    reportPaymentFailed(orderId).catch(() => {})
    setServerError(message)
    setPhase('idle')
  }

  const confirmPayment = async (orderId, response) => {
    setPhase('verifying')

    try {
      await verifyPayment({
        shopKartOrderId: orderId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      })

      // The server has saved the order and emptied the cart — mirror it.
      clearCart()
      navigate(`/order-success/${orderId}`, { replace: true })
    } catch (requestError) {
      setServerError(
        `${getErrorMessage(requestError, 'We could not verify your payment.')} ` +
          'Your cart has not been cleared. If money was deducted, it will be refunded by Razorpay.',
      )
      setPhase('idle')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (busy) return

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setServerError('')
    setPhase('creating')

    const shippingAddress = trimAll(form)

    // Load the script before creating an order, so a blocked script does
    // not leave a pending order behind.
    if (!(await loadRazorpay())) {
      setServerError(
        'Could not load Razorpay Checkout. Check your connection or disable any ad blocker, then try again.',
      )
      setPhase('idle')
      return
    }

    let data
    try {
      ;({ data } = await createPaymentOrder(shippingAddress))
    } catch (requestError) {
      setServerError(getErrorMessage(requestError, 'Could not start checkout.'))
      setPhase('idle')
      // Stock or prices may have moved — show the cart as it is now.
      refreshCart()
      return
    }

    const orderId = data.shopKartOrderId
    let settled = false

    const razorpay = new window.Razorpay({
      key: data.key,
      amount: data.amount,
      currency: data.currency,
      name: 'ShopKart',
      description: 'ShopKart Order',
      order_id: data.razorpayOrderId,
      // Not proof of payment — just the details for the server to verify.
      handler: (response) => {
        settled = true
        confirmPayment(orderId, response)
      },
      prefill: {
        name: shippingAddress.fullName,
        email: user?.email,
        contact: shippingAddress.phone,
      },
      theme: { color: '#4f46e5' },
      modal: {
        ondismiss: () => {
          if (settled) return
          setServerError('Payment was cancelled. Your cart is still saved — you can try again.')
          setPhase('idle')
        },
      },
    })

    razorpay.on('payment.failed', (response) => {
      settled = true
      failPayment(
        orderId,
        `Payment failed${response.error?.description ? `: ${response.error.description}` : '.'} ` +
          'Your cart has not been cleared. Please try again.',
      )
    })

    setPhase('paying')
    razorpay.open()
  }

  const buttonLabel = {
    idle: `Pay ${formatPrice(subtotal)} with Razorpay`,
    creating: 'Preparing your order…',
    paying: 'Waiting for payment…',
    verifying: 'Verifying payment…',
  }[phase]

  const renderBody = () => {
    if (loading) return <StatusBlock variant="loading" title="Loading your cart..." />

    if (error) {
      return (
        <StatusBlock variant="error" title="Unable to load your cart." message={error}>
          <button type="button" className="btn btn--primary btn--sm" onClick={refreshCart}>
            Try Again
          </button>
        </StatusBlock>
      )
    }

    // Someone opening /checkout directly with nothing to buy. Skipped
    // while verifying: the cart is emptied just before we navigate away.
    if (cartItems.length === 0 && phase === 'idle') {
      return (
        <StatusBlock
          variant="empty"
          icon="cart"
          title="Your cart is empty"
          message="Add something to your cart before checking out."
        >
          <Link to="/products" className="btn btn--primary btn--sm">
            Browse Products
          </Link>
        </StatusBlock>
      )
    }

    return (
      <form className="checkout" onSubmit={handleSubmit} noValidate>
        <section className="checkout__panel" aria-labelledby="shipping-title">
          <h2 id="shipping-title" className="checkout__heading">
            Shipping details
          </h2>

          <fieldset className="checkout__fields" disabled={busy}>
            {FIELDS.map(({ name, ...props }) => (
              <div key={name} className={name === 'addressLine1' ? 'checkout__wide' : undefined}>
                <FormField
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  error={errors[name]}
                  {...props}
                />
              </div>
            ))}
          </fieldset>
        </section>

        <aside className="summary" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title" className="summary__title">
            Order Summary
          </h2>

          <ul className="checkout__lines">
            {cartItems.map(({ product, quantity }) => (
              <li key={product._id} className="checkout__line">
                <span className="checkout__line-name">
                  {product.name} <span className="checkout__line-qty">× {quantity}</span>
                </span>
                <span className="checkout__line-price">{formatPrice(product.price * quantity)}</span>
              </li>
            ))}
          </ul>

          <dl className="summary__rows">
            <div>
              <dt>Units</dt>
              <dd>{totalUnits}</dd>
            </div>
            <div>
              <dt>Shipping</dt>
              <dd>Free</dd>
            </div>
            <div className="summary__subtotal">
              <dt>Total</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
          </dl>

          {serverError && (
            <p className="alert alert--error" role="alert">
              {serverError}
            </p>
          )}

          {blocked && (
            <p className="summary__warning" role="alert">
              Some items exceed the stock now available. <Link to="/cart">Update your cart</Link>{' '}
              to continue.
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--block" disabled={busy || blocked}>
            {busy && <span className="spinner spinner--inline" aria-hidden="true" />}
            {buttonLabel}
          </button>

          <p className="summary__hint">
            Test mode — no real money is charged. The final amount is confirmed by the server.
          </p>

          <Link to="/cart" className="summary__continue">
            Back to cart
          </Link>
        </aside>
      </form>
    )
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <header className="catalog__header">
          <p className="catalog__eyebrow">Almost there</p>
          <h1 className="catalog__title">Checkout</h1>
          <p className="catalog__subtitle">Where should we deliver your order?</p>
        </header>

        {renderBody()}
      </main>
    </div>
  )
}
