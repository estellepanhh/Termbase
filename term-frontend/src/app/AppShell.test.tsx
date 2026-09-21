import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import i18n from '../locales'
import AppRoutes from './routes'
import { ChildModeProvider } from '../context/ChildModeContext'

function renderRoute(path = '/discover') {
  return render(
    <ChildModeProvider><MemoryRouter initialEntries={[path]}><AppRoutes /><LocationProbe /></MemoryRouter></ChildModeProvider>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="app-location">{location.pathname}</output>
}

describe('research platform application shell', () => {
  beforeEach(async () => {
    localStorage.clear()
    await i18n.changeLanguage('zh')
  })

  afterEach(async () => {
    await i18n.changeLanguage('zh')
  })

  it('renders canonical content inside semantic landmarks and marks its navigation link current', () => {
    renderRoute()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('术语探索')
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByText('中国特色话语多语术语库')).toBeInTheDocument()

    const navigation = screen.getByRole('navigation', { name: '主导航' })
    expect(within(navigation).getByRole('link', { name: '术语检索' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('switches the visible shell labels between Chinese and English', async () => {
    const user = userEvent.setup()
    renderRoute()

    await act(async () => {
      await user.click(screen.getByRole('button', { name: '切换至英文' }))
    })

    expect(await screen.findByRole('link', { name: 'Term Search' })).toHaveAttribute(
      'href',
      '/discover',
    )
    expect(screen.getByText('Chinese Cultural Terminology Database')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Expression Lab' })).toHaveAttribute('href', '/lab')
    expect(screen.getByRole('button', { name: 'Switch to Chinese' })).toBeInTheDocument()
  })

  it.each([
    ['/search', '/discover'],
    ['/browse', '/discover'],
    ['/guide', '/discover'],
    ['/huaihe', '/topics/huaihe-culture'],
    ['/about', '/topics'],
  ])('redirects legacy URL %s to the supported public route', async (legacyPath, expectedPath) => {
    renderRoute(legacyPath)

    await waitFor(() => expect(screen.getByTestId('app-location')).toHaveTextContent(expectedPath))
  })

  it('makes mobile navigation available from an accessible menu control', async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(screen.getByRole('button', { name: '打开导航菜单' }))

    const navigationDialog = await screen.findByRole('dialog', { name: '主导航' })
    expect(within(navigationDialog).getByRole('link', { name: '研究工作台' })).toHaveAttribute(
      'href',
      '/workspace',
    )
  })

  it('applies child and large-text modes to the full application shell', async () => {
    const user = userEvent.setup()
    renderRoute()
    const shell = document.querySelector('.app-shell')
    await user.click(screen.getByRole('button', { name: '开启儿童模式' }))
    await user.click(screen.getByRole('button', { name: '开启大字模式' }))
    expect(shell).toHaveAttribute('data-child-mode', 'true')
    expect(shell).toHaveAttribute('data-large-text', 'true')
  })
})
