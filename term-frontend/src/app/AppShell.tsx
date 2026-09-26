import { MenuOutlined } from '@ant-design/icons'
import { Button, Drawer } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import ReadingPreferenceControls from '../components/ReadingPreferenceControls'
import { useChildMode } from '../context/ChildModeContext'

type ShellLabels = {
  lab: string
  topics: string
  workspace: string
  project: string
  platformName: string
  primaryNavigation: string
  mobileNavigation: string
  openMenu: string
  switchLanguage: string
  languageControl: string
  footer: string
}

const newConceptLabels: Record<'zh' | 'en', ShellLabels> = {
  zh: {
    lab: '表达实验室',
    topics: '文化专题',
    workspace: '研究工作台',
    project: '项目成果',
    platformName: '中国特色话语多语知识平台',
    primaryNavigation: '主导航',
    mobileNavigation: '移动端主导航',
    openMenu: '打开导航菜单',
    switchLanguage: '切换至英文',
    languageControl: 'English',
    footer: '中国特色话语多语知识平台 · 学术研究与国际传播',
  },
  en: {
    lab: 'Expression Lab',
    topics: 'Cultural Topics',
    workspace: 'Research Workspace',
    project: 'Project',
    platformName: 'Chinese Discourse Multilingual Knowledge Platform',
    primaryNavigation: 'Primary navigation',
    mobileNavigation: 'Mobile navigation',
    openMenu: 'Open navigation menu',
    switchLanguage: 'Switch to Chinese',
    languageControl: '中文',
    footer: 'Chinese Discourse Multilingual Knowledge Platform · Research and international communication',
  },
}

type NavigationItem = {
  to: string
  label: string
  end?: boolean
}

type NavigationProps = {
  items: NavigationItem[]
  onNavigate?: () => void
}

function Navigation({ items, onNavigate }: NavigationProps) {
  return (
    <>
      {items.map(({ to, label, end }) => (
        <NavLink
          className="app-navigation__link"
          end={end}
          key={to}
          onClick={onNavigate}
          to={to}
        >
          {label}
        </NavLink>
      ))}
    </>
  )
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { i18n, t } = useTranslation()
  const isChinese = (i18n.resolvedLanguage ?? i18n.language).startsWith('zh')
  const labels = newConceptLabels[isChinese ? 'zh' : 'en']
  const { isChildMode, isLargeTextMode } = useChildMode()
  const brandTitle = t('site_title')
  const navigationItems: NavigationItem[] = [
    { to: '/', label: t('home'), end: true },
    { to: '/discover', label: t('search') },
    { to: '/lab', label: labels.lab },
    { to: '/topics', label: labels.topics },
    { to: '/workspace', label: labels.workspace },
    { to: '/about', label: labels.project },
  ]

  const toggleLanguage = () => {
    void i18n.changeLanguage(isChinese ? 'en' : 'zh')
  }

  return (
    <div className="app-shell" data-child-mode={isChildMode || undefined} data-large-text={isLargeTextMode || undefined}>
      <header className="app-header">
        <div className="app-header__content">
          <NavLink aria-label={`${brandTitle} ${t('home')}`} className="app-brand" to="/">
            <span aria-hidden="true" className="app-brand__mark">
              文
            </span>
            <span>
              <span className="app-brand__title">{brandTitle}</span>
              <span className="app-brand__subtitle">
                {newConceptLabels.en.platformName}
              </span>
            </span>
          </NavLink>

          <nav aria-label={labels.primaryNavigation} className="app-navigation app-navigation--desktop">
            <Navigation items={navigationItems} />
          </nav>

          <div className="app-header__actions">
            <ReadingPreferenceControls />
            <Button aria-label={labels.switchLanguage} onClick={toggleLanguage} type="text">
              {labels.languageControl}
            </Button>
            <Button
              aria-label={labels.openMenu}
              className="app-menu-button"
              icon={<MenuOutlined />}
              onClick={() => setMenuOpen(true)}
              type="text"
            />
          </div>
        </div>
      </header>

      <Drawer
        aria-label={labels.primaryNavigation}
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        placement="right"
        title={labels.primaryNavigation}
      >
        <nav aria-label={labels.mobileNavigation} className="mobile-navigation">
          <Navigation items={navigationItems} onNavigate={() => setMenuOpen(false)} />
        </nav>
      </Drawer>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="app-footer__content">{labels.footer}</div>
      </footer>
    </div>
  )
}
