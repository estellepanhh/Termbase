import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import RequireAdmin from './RequireAdmin'
import HomePage from '../features/home/HomePage'
import DiscoveryPage from '../features/discovery/DiscoveryPage'
import TermProfilePage from '../features/term-profile/TermProfilePage'
import CoConstructionPage from '../features/co-construction/CoConstructionPage'
import TopicsPage from '../features/topics/TopicsPage'
import TopicDetailPage from '../features/topics/TopicDetailPage'
import AboutPage from '../features/about/AboutPage'
import TermManagementPage from '../features/term-management/TermManagementPage'
import LoginPage from '../features/auth/LoginPage'
import { AuthProvider } from '../context/AuthContext'

export default function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="discover" element={<DiscoveryPage />} />
          <Route path="terms/:id" element={<TermProfilePage />} />
          <Route path="co-construction" element={<CoConstructionPage />} />
          <Route path="topics" element={<TopicsPage />} />
          <Route path="topics/:slug" element={<TopicDetailPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="manage" element={<RequireAdmin><TermManagementPage /></RequireAdmin>} />
          <Route path="search" element={<Navigate replace to="/discover" />} />
          <Route path="browse" element={<Navigate replace to="/discover" />} />
          <Route path="guide" element={<Navigate replace to="/discover" />} />
          <Route path="huaihe" element={<Navigate replace to="/topics/huaihe-culture" />} />
          <Route path="lab" element={<Navigate replace to="/co-construction" />} />
          <Route path="workspace" element={<Navigate replace to="/co-construction" />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
