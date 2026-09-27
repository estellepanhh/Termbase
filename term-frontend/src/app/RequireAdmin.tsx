import { Navigate, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuth } from '../context/useAuth'

export default function RequireAdmin({ children }: { children: ReactElement }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status !== 'authenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (!auth.isAdmin) {
    return <Navigate replace to="/" />
  }

  return children
}
