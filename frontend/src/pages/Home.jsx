import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

const COMING_SOON = [
  { label: 'Checkout', detail: 'Shipping address and final stock check', lab: 'Lab 06' },
  { label: 'My Orders', detail: 'Cart → order conversion and history', lab: 'Lab 06' },
]

export default function Home() {
  // The user was loaded from GET /customers/me by AuthProvider — this page
  // never has to trust anything the browser stored locally.
  const { user, refreshUser } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshUser()
    setRefreshing(false)
  }

  return (
    <div className="page">
      <Navbar />

      <main className="page__body">
        <section className="welcome">
          <p className="welcome__eyebrow">Your account</p>
          <h1 className="welcome__title">
            Welcome back, {user.fullName.split(' ')[0]}
          </h1>
          <p className="welcome__subtitle">
            You are signed in to ShopKart. Your session is held in a secure
            HttpOnly cookie.
          </p>
          <Link to="/products" className="btn btn--light welcome__cta">
            Browse products
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </section>

        <section className="card profile">
          <header className="card__header">
            <h2>Profile details</h2>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </header>

          <dl className="profile__grid">
            <div className="profile__row">
              <dt>Full name</dt>
              <dd>{user.fullName}</dd>
            </div>
            <div className="profile__row">
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="profile__row">
              <dt>Phone number</dt>
              <dd>{user.phone}</dd>
            </div>
            <div className="profile__row">
              <dt>Customer ID</dt>
              <dd className="profile__id">{user._id}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <header className="card__header">
            <h2>Coming soon</h2>
          </header>

          <ul className="tiles">
            {COMING_SOON.map((item) => (
              <li key={item.label} className="tile">
                <span className="tile__badge">{item.lab}</span>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
