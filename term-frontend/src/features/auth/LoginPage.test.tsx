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
  registerRequest: vi.fn(),
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
      token: 'user-token',
      user: { username: 'user', role: 'user', display_name: '普通用户' },
    })
    vi.mocked(authApi.registerRequest).mockResolvedValue({
      token: 'user-token',
      user: { username: 'student', role: 'user', display_name: '术语研究者' },
    })
  })

  it('logs in as a normal user with entered username and password', async () => {
    const user = userEvent.setup()
    render(
      <ChildModeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      </ChildModeProvider>,
    )

    expect(screen.queryByText(/user \/ 123456/)).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('账号'), 'student')
    await user.type(screen.getByLabelText('密码'), 'abcdef')
    await user.click(screen.getByRole('button', { name: '普通用户登录' }))

    await waitFor(() => expect(screen.getByText(/普通用户/)).toBeInTheDocument())
    expect(authApi.loginRequest).toHaveBeenCalledWith('student', 'abcdef')
    expect(localStorage.getItem('termbase-auth')).toContain('user-token')
  })

  it('locks administrator login to the fixed admin account', async () => {
    const user = userEvent.setup()
    render(
      <ChildModeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      </ChildModeProvider>,
    )

    await user.click(screen.getByRole('button', { name: '管理员登录' }))
    expect(screen.getByLabelText('管理员账号')).toHaveValue('admin')
    await user.type(screen.getByLabelText('密码'), '123456')
    await user.click(screen.getByRole('button', { name: '管理员登录' }))

    await waitFor(() => expect(authApi.loginRequest).toHaveBeenCalledWith('admin', '123456'))
  })

  it('registers a normal user and signs in immediately', async () => {
    const user = userEvent.setup()
    render(
      <ChildModeProvider>
        <MemoryRouter initialEntries={['/login']}>
          <AppRoutes />
        </MemoryRouter>
      </ChildModeProvider>,
    )

    await user.click(screen.getByRole('tab', { name: '注册' }))
    await user.type(screen.getByLabelText('昵称'), '术语研究者')
    await user.type(screen.getByLabelText('账号'), 'student')
    await user.type(screen.getByLabelText('密码'), '123456')
    await user.click(screen.getByRole('button', { name: '注册并进入' }))

    await waitFor(() => expect(screen.getByText(/术语研究者/)).toBeInTheDocument())
    expect(authApi.registerRequest).toHaveBeenCalledWith('student', '123456', '术语研究者')
    expect(localStorage.getItem('termbase-auth')).toContain('user-token')
  })
})
