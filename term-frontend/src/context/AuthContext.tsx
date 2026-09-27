import { useMemo, useState, type ReactNode } from 'react'
import {
  clearStoredAuth,
  getStoredAuth,
  loginRequest,
  registerRequest,
  saveStoredAuth,
} from '../services/authApi'
import { AuthContext, type AuthContextValue } from './authContextValue'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(getStoredAuth)

  const value = useMemo<AuthContextValue>(() => ({
    status: auth ? 'authenticated' : 'unauthenticated',
    token: auth?.token ?? null,
    user: auth?.user ?? null,
    isAdmin: auth?.user.role === 'admin',
    async login(username, password) {
      const next = await loginRequest(username, password)
      saveStoredAuth(next)
      setAuth(next)
    },
    async register(username, password, displayName) {
      const next = await registerRequest(username, password, displayName)
      saveStoredAuth(next)
      setAuth(next)
    },
    logout() {
      clearStoredAuth()
      setAuth(null)
    },
  }), [auth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

