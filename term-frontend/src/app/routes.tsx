import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import HomePage from '../features/home/HomePage'
import DiscoveryPage from '../features/discovery/DiscoveryPage'
import TermProfilePage from '../features/term-profile/TermProfilePage'
import ExpressionLabPage from '../features/expression-lab/ExpressionLabPage'
import ReviewWorkspacePage from '../features/review-workspace/ReviewWorkspacePage'
import TopicsPage from '../features/topics/TopicsPage'
import TopicDetailPage from '../features/topics/TopicDetailPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="discover" element={<DiscoveryPage />} />
        <Route path="terms/:id" element={<TermProfilePage />} />
        <Route path="lab" element={<ExpressionLabPage />} />
        <Route path="topics" element={<TopicsPage />} />
        <Route path="topics/:slug" element={<TopicDetailPage />} />
        <Route path="workspace" element={<ReviewWorkspacePage />} />
        <Route path="search" element={<Navigate replace to="/discover" />} />
        <Route path="browse" element={<Navigate replace to="/discover" />} />
        <Route path="guide" element={<Navigate replace to="/discover" />} />
        <Route path="huaihe" element={<Navigate replace to="/topics/huaihe-culture" />} />
        <Route path="about" element={<Navigate replace to="/topics" />} />
      </Route>
    </Routes>
  )
}
