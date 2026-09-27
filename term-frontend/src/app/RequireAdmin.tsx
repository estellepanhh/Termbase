import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireAdmin({ children }: { children: JSX.Element }) {
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
