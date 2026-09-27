import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChildModeProvider } from '../context/ChildModeContext'
import AppRoutes from './routes'
import * as authApi from '../services/authApi'
import '../locales'

vi.mock('../services/authApi', () => ({
  loginRequest: vi.fn(),
  getCurrentUser: vi.fn(),
  getAuthToken: vi.fn(() => null),
  getStoredAuth: vi.fn(() => {
    const raw = localStorage.getItem('termbase-auth')
    return raw ? JSON.parse(raw) : null
  }),
  saveStoredAuth: vi.fn((auth) => localStorage.setItem('termbase-auth', JSON.stringify(auth))),
  clearStoredAuth: vi.fn(() => localStorage.removeItem('termbase-auth')),
}))

vi.mock('../services/knowledgeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/knowledgeApi')>()
  return { ...actual, listAdminTerms: vi.fn() }
})

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderRoute(path: string) {
  return render(
    <ChildModeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </ChildModeProvider>,
  )
}

describe('protected admin routes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('not logged in'))
  })

  it('redirects unauthenticated visitors from /manage to /login', async () => {
    renderRoute('/manage')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
  })

  it('redirects non-admin users away from /manage', async () => {
    localStorage.setItem('termbase-auth', JSON.stringify({
      token: 'user-token',
      user: { username: 'user', role: 'user', display_name: '普通用户' },
    }))

    renderRoute('/manage')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
  })
})
