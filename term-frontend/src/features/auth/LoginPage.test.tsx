import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChildModeProvider } from '../../context/ChildModeContext'
import AppRoutes from '../../app/routes'
import * as authApi from '../../services/authApi'
import '../../locales'

vi.mock('../../services/authApi', () => ({
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

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('not logged in'))
    vi.mocked(authApi.loginRequest).mockResolvedValue({
      token: 'admin-token',
      user: { username: 'admin', role: 'admin', display_name: '管理员' },
    })
  })

  it('logs in with demo credentials and shows the current user', async () => {
    const user = userEvent.setup()
    render(
      <ChildModeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      </ChildModeProvider>,
    )

    await user.type(screen.getByLabelText('账号'), 'admin')
    await user.type(screen.getByLabelText('密码'), '123456')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => expect(screen.getByText(/管理员/)).toBeInTheDocument())
    expect(localStorage.getItem('termbase-auth')).toContain('admin-token')
  })
})
