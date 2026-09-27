import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  clearStoredAuth,
  getStoredAuth,
  loginRequest,
  saveStoredAuth,
  type AuthUser,
} from '../services/authApi'

type AuthStatus = 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  status: AuthStatus
  token: string | null
  user: AuthUser | null
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

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
    logout() {
      clearStoredAuth()
      setAuth(null)
    },
  }), [auth])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
