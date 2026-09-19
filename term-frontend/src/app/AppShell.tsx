import { MenuOutlined } from '@ant-design/icons'
import { Button, Drawer } from 'antd'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const navigationItems = [
  { to: '/', label: '首页', end: true },
  { to: '/discover', label: '术语探索' },
  { to: '/lab', label: '表达实验室' },
  { to: '/topics', label: '文化专题' },
  { to: '/workspace', label: '研究工作台' },
]

type NavigationProps = { onNavigate?: () => void }

function Navigation({ onNavigate }: NavigationProps) {
  return <>{navigationItems.map(({ to, label, end }) => <NavLink className="app-navigation__link" end={end} key={to} onClick={onNavigate} to={to}>{label}</NavLink>)}</>
}

export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)

  return <div className="app-shell">
    <header className="app-header">
      <div className="app-header__content">
        <NavLink aria-label="中国特色话语多语知识平台首页" className="app-brand" to="/">
          <span aria-hidden="true" className="app-brand__mark">文</span>
          <span><span className="app-brand__title">中国特色话语多语知识平台</span><span className="app-brand__subtitle">Chinese Discourse Multilingual Knowledge Platform</span></span>
        </NavLink>
        <nav aria-label="主导航" className="app-navigation app-navigation--desktop"><Navigation /></nav>
        <Button aria-label="打开导航菜单" className="app-menu-button" icon={<MenuOutlined />} onClick={() => setMenuOpen(true)} type="text" />
      </div>
    </header>
    <Drawer aria-label="主导航" onClose={() => setMenuOpen(false)} open={menuOpen} placement="right" title="主导航">
      <nav aria-label="移动端主导航" className="mobile-navigation"><Navigation onNavigate={() => setMenuOpen(false)} /></nav>
    </Drawer>
    <main className="app-main"><Outlet /></main>
    <footer className="app-footer"><div className="app-footer__content">中国特色话语多语知识平台 · 学术研究与国际传播</div></footer>
  </div>
}
