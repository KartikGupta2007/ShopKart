import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext'
import {
  getMyProfile,
  loginCustomer,
  logoutCustomer,
} from '../services/api'

/**
 * Holds the logged-in customer for the whole app.
 *
 * The token lives in an HttpOnly cookie that JavaScript cannot read, so the
 * only way to know who is logged in is to ask the server: GET /customers/me.
 * That call is the single source of truth — we never keep a copy of the user
 * in localStorage, which could go stale or be edited by hand.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // true only for the first session check, so protected routes can wait
  // instead of bouncing a logged-in user to /login on a page refresh.
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await getMyProfile()
      setUser(data)
      return data
    } catch {
      // 401 simply means "no valid cookie" — not an error worth surfacing.
      setUser(null)
      return null
    }
  }, [])

  // Ask the server once on mount whether this browser has a valid cookie.
  useEffect(() => {
    let cancelled = false

    getMyProfile()
      .then(({ data }) => {
        if (!cancelled) setUser(data)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (credentials) => {
      await loginCustomer(credentials)
      // The cookie is set by now; ask the server who we are.
      return refreshUser()
    },
    [refreshUser],
  )

  const logout = useCallback(async () => {
    try {
      await logoutCustomer()
    } finally {
      // Even if the call fails (expired cookie), drop the local session.
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
