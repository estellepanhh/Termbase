import { createContext } from 'react'
import type { AuthUser } from '../services/authApi'

export type AuthStatus = 'authenticated' | 'unauthenticated'

export type AuthContextValue = {
  status: AuthStatus
  token: string | null
  user: AuthUser | null
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
