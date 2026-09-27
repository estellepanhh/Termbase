import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../../locales'
import { AuthProvider } from '../../context/AuthContext'
import HomePage from './HomePage'

function renderHome() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('presents the project as a public digital exhibition without a hero search box', () => {
    renderHome()

    expect(screen.getByRole('heading', { name: '中国特色话语多语术语库工程化建设与研究' })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.getByText('术语采集')).toBeInTheDocument()
    expect(screen.getByText('AI 辅助表达')).toBeInTheDocument()
    expect(screen.getByText('淮河文化示范专题')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '本源层' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '核心层' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '拓展层' })).toBeInTheDocument()
  })

  it('keeps public research entrances available to normal visitors', () => {
    renderHome()

    expect(screen.getAllByRole('link', { name: '进入术语探索' })[0]).toHaveAttribute('href', '/discover')
    expect(screen.getAllByRole('link', { name: '查看项目介绍' })[0]).toHaveAttribute('href', '/about')
    expect(screen.getByRole('link', { name: '进入表达实验室' })).toHaveAttribute('href', '/lab')
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
