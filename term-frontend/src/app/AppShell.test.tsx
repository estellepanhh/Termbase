import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AppShell from './AppShell'

describe('AppShell', () => {
  it('presents the public research navigation and platform identity', () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '术语探索' })).toHaveAttribute('href', '/discover')
    expect(screen.getByRole('link', { name: '表达实验室' })).toHaveAttribute('href', '/lab')
    expect(screen.getByRole('link', { name: '文化专题' })).toHaveAttribute('href', '/topics')
    expect(screen.getByText('中国特色话语多语知识平台')).toBeInTheDocument()
  })

  it('makes the mobile navigation available from an accessible menu control', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()

    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: '打开导航菜单' }))

    const navigationDialog = await screen.findByRole('dialog', { name: '主导航' })
    expect(within(navigationDialog).getByRole('link', { name: '研究工作台' })).toHaveAttribute(
      'href',
      '/workspace',
    )
  })
})
