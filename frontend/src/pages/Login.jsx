import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  // Set by Register on a successful signup, and by ProtectedRoute when it
  // bounces someone away from a page they were trying to reach.
  const { registered, email: registeredEmail, from } = location.state ?? {}

  const [form, setForm] = useState({ email: registeredEmail ?? '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setServerError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = {}
    if (!form.email.trim()) nextErrors.email = 'Email is required'
    if (!form.password) nextErrors.password = 'Password is required'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setServerError('')

    try {
      // login() posts the credentials, the browser stores the HttpOnly cookie
      // that comes back, then it fetches /customers/me to fill the context.
      await login({ email: form.email.trim(), password: form.password })
      navigate(from || '/home', { replace: true })
    } catch (error) {
      // The API deliberately does not say whether the email or the password
      // was wrong, so neither do we.
      setServerError(
        error.response?.status === 401
          ? 'Invalid Credentials'
          : getErrorMessage(error, 'Login failed'),
      )
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={
        <>
          New to ShopKart? <Link to="/register">Create an account</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {registered && (
          <p className="alert alert--success" role="status">
            Account created. Please log in to continue.
          </p>
        )}

        {serverError && (
          <p className="alert alert--error" role="alert">
            {serverError}
          </p>
        )}

        <FormField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="john@gmail.com"
          autoComplete="email"
          autoFocus
        />

        <FormField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </AuthLayout>
  )
}
