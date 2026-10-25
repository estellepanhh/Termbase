import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChildModeProvider } from '../../context/ChildModeContext'
import AppRoutes from '../../app/routes'
import * as api from '../../services/coConstructionApi'
import '../../locales'

vi.mock('../../services/coConstructionApi', () => ({
  createSubmission: vi.fn(),
  listMySubmissions: vi.fn(),
  withdrawSubmission: vi.fn(),
}))

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

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderRoute(path = '/co-construction') {
  return render(
    <ChildModeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </ChildModeProvider>,
  )
}

describe('CoConstructionPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(api.listMySubmissions).mockResolvedValue([])
    vi.mocked(api.createSubmission).mockResolvedValue({
      public_id: 'sub-1',
      preferred_name_zh: '天下为公',
      definition_zh: '公共价值',
      recommended_translation: 'the world belongs to all',
      cultural_connotation: '',
      source_text: '',
      status: 'pending',
      review_note: '',
      term_id: null,
    })
  })

  it('redirects unauthenticated users to login', async () => {
    renderRoute()

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
  })

  it('submits a co-construction record for authenticated users', async () => {
    localStorage.setItem('termbase-auth', JSON.stringify({
      token: 'user-token',
      user: { username: 'user', role: 'user', display_name: '普通用户' },
    }))
    const user = userEvent.setup()
    renderRoute()

    const process = screen.getByRole('navigation', { name: '术语共建流程' })
    expect(within(process).getByText('提交资料')).toBeInTheDocument()
    expect(within(process).getByText('专业审核')).toBeInTheDocument()
    expect(within(process).getByText('进入术语库')).toBeInTheDocument()

    await user.type(screen.getByLabelText('术语名称'), '天下为公')
    await user.type(screen.getByLabelText('定义说明'), '公共价值')
    await user.type(screen.getByLabelText('推荐译法'), 'the world belongs to all')
    await user.click(screen.getByRole('button', { name: '提交审核' }))

    await waitFor(() => expect(api.createSubmission).toHaveBeenCalledWith(expect.objectContaining({
      preferred_name_zh: '天下为公',
      definition_zh: '公共价值',
    })))
    expect(await screen.findByText('待审核')).toBeInTheDocument()
  })
})
