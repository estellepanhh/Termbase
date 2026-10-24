import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../locales'
import { AuthProvider } from '../../context/AuthContext'
import HomePage from './HomePage'

function renderHome() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <HomePage /><LocationProbe />
      </MemoryRouter>
    </AuthProvider>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="home-location">{`${location.pathname}${location.search}`}</output>
}

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('presents an open editorial homepage with a direct term search', async () => {
    const user = userEvent.setup()
    renderHome()

    expect(screen.getByRole('heading', { name: '中国特色话语多语术语库' })).toBeInTheDocument()
    await user.type(screen.getByRole('searchbox', { name: '检索术语' }), '淮河文化')
    await user.click(screen.getByRole('button', { name: '开始检索' }))
    expect(screen.getByTestId('home-location')).toHaveTextContent('/discover?q=%E6%B7%AE%E6%B2%B3%E6%96%87%E5%8C%96')
    expect(screen.getByRole('navigation', { name: '平台使用路径' })).toBeInTheDocument()
    expect(screen.queryByText('文脉知识工程')).not.toBeInTheDocument()
    expect(screen.getByText('淮河文化示范专题')).toBeInTheDocument()
  })

  it('keeps public research entrances available to normal visitors', () => {
    renderHome()

    expect(screen.getAllByRole('link', { name: '进入术语检索' })[0]).toHaveAttribute('href', '/discover')
    expect(screen.getAllByRole('link', { name: '参与术语共建' })[0]).toHaveAttribute('href', '/co-construction')
    expect(screen.queryByRole('link', { name: '进入表达实验室' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '查看淮河文化专题' })).toHaveAttribute('href', '/topics/huaihe-culture')
    expect(screen.queryByRole('link', { name: '进入术语管理' })).not.toBeInTheDocument()
  })

  it('shows the term management entrance only for admins', () => {
    localStorage.setItem('termbase-auth', JSON.stringify({
      token: 'admin-token',
      user: { username: 'admin', role: 'admin', display_name: '管理员' },
    }))

    renderHome()

    expect(screen.getByRole('link', { name: '进入术语管理' })).toHaveAttribute('href', '/manage')
  })
})
