import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Layout, Typography, Button, Space } from 'antd'
import { TranslationOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import HomePage from './pages/HomePage'
import UserGuidePage from './pages/UserGuidePage'
import AboutPage from './pages/AboutPage'
import HuaihePage from './pages/HuaihePage'
import ChatAI from './components/ChatAI'
import FloatingTools from './components/FloatingTools'
import ErrorBoundary from './components/ErrorBoundary'
import { ChildModeProvider } from './context/ChildModeContext'

const { Header, Content, Footer } = Layout
const { Text } = Typography

const App: React.FC = () => {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
  }

  return (
    <ChildModeProvider>
      <BrowserRouter>
        <Layout
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #e6f7ff 0%, #f5f8ff 100%)',
          }}
        >
          <Header
            style={{
              background: '#fff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 40px',
              height: 70,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: '#1677ff',
                  borderRadius: 8,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: 18,
                }}
              >
                文
              </div>
              <Text style={{ fontSize: 18, fontWeight: 500, color: '#1677ff' }}>
                {t('site_title')}
              </Text>
            </div>
            <nav style={{ display: 'flex', gap: 40, fontSize: 15 }}>
              <Link to="/" style={{ color: '#1677ff', fontWeight: 500 }}>
                {t('home')}
              </Link>
              <Link to="/search" style={{ color: '#666' }}>
                {t('search')}
              </Link>
              <Link to="/browse" style={{ color: '#666' }}>
                {t('browse')}
              </Link>
              <Link to="/guide" style={{ color: '#666' }}>
                {t('guide')}
              </Link>
              <Link to="/about" style={{ color: '#666' }}>
                {t('about')}
              </Link>
            </nav>
            <Space>
              <Button icon={<TranslationOutlined />} onClick={toggleLanguage}>
                {i18n.language === 'zh' ? 'English' : '中文'}
              </Button>
            </Space>
          </Header>

          <ErrorBoundary>
            <Content>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<HomePage />} />
                <Route path="/browse" element={<HomePage />} />
                <Route path="/guide" element={<UserGuidePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/huaihe" element={<HuaihePage />} />
              </Routes>
            </Content>
          </ErrorBoundary>

          <ChatAI />
          <FloatingTools />

          <Footer
            style={{
              textAlign: 'center',
              background: 'transparent',
              color: '#888',
              padding: '25px 0',
            }}
          >
            中国特色话语多语术语库 ©2026
          </Footer>
        </Layout>
      </BrowserRouter>
    </ChildModeProvider>
  )
}

export default App
