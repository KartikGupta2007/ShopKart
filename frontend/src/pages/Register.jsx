import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import FormField from '../components/FormField'
import { getErrorMessage, registerCustomer } from '../services/api'

const EMPTY_FORM = { fullName: '', email: '', password: '', phone: '' }

/**
 * Client-side checks that mirror the backend rules, so the customer sees the
 * problem before a round trip. The server still validates everything again —
 * anything sent from a browser can be tampered with.
 */
const validate = ({ fullName, email, password, phone }) => {
  const errors = {}

  if (!fullName.trim()) errors.fullName = 'Full name is required'
  else if (fullName.trim().length < 3)
    errors.fullName = 'Full name must be at least 3 characters'

  if (!email.trim()) errors.email = 'Email is required'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = 'Enter a valid email address'

  if (!password) errors.password = 'Password is required'
  else if (password.length < 6)
    errors.password = 'Password must be at least 6 characters'

  if (!phone.trim()) errors.phone = 'Phone number is required'
  else if (!/^[0-9]{10}$/.test(phone.trim()))
    errors.phone = 'Enter a 10-digit phone number'

  return errors
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // One handler for every controlled input, keyed by the input's name.
  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((previous) => ({ ...previous, [name]: value }))
    setErrors((previous) => ({ ...previous, [name]: undefined }))
    setServerError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const nextErrors = validate(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setServerError('')

    try {
      await registerCustomer({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
      })

      // Registration does not log the customer in, so send them to /login
      // with a flag the login page turns into a success banner.
      navigate('/login', {
        replace: true,
        state: { registered: true, email: form.email.trim() },
      })
    } catch (error) {
      const message = getErrorMessage(error, 'Registration failed')

      // 409 is specifically "this email is taken" — pin it to the email field.
      if (error.response?.status === 409) {
        setErrors((previous) => ({ ...previous, email: message }))
      } else {
        setServerError(message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join ShopKart in under a minute."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="alert alert--error" role="alert">
            {serverError}
          </p>
        )}

        <FormField
          label="Full name"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          error={errors.fullName}
          placeholder="John Doe"
          autoComplete="name"
          autoFocus
        />

        <FormField
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="john@gmail.com"
          autoComplete="email"
        />

        <FormField
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 6 characters"
          placeholder="••••••••"
          autoComplete="new-password"
        />

        <FormField
          label="Phone number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="9876543210"
          autoComplete="tel"
          inputMode="numeric"
          maxLength={10}
        />

        <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}
