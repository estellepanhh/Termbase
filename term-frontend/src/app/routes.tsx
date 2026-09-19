import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import HomePage from '../features/home/HomePage'

type PlaceholderPageProps = {
  title: string
  description: string
}

function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section aria-labelledby="route-title" className="app-route-placeholder">
      <div className="app-route-placeholder__eyebrow">RESEARCH PLATFORM</div>
      <h1 id="route-title">{title}</h1>
      <p>{description}</p>
    </section>
  )
}

function DiscoveryPage() {
  return <PlaceholderPage description="术语探索功能正在建设中。" title="术语探索" />
}

function TermProfilePage() {
  return <PlaceholderPage description="术语档案功能正在建设中。" title="术语档案" />
}

function StagedPage({ title }: Pick<PlaceholderPageProps, 'title'>) {
  return (
    <PlaceholderPage
      description="该研究功能处于下一阶段建设，现不跳转至旧版 CRUD 页面。"
      title={title}
    />
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="discover" element={<DiscoveryPage />} />
        <Route path="terms/:id" element={<TermProfilePage />} />
        <Route path="lab" element={<StagedPage title="表达实验室" />} />
        <Route path="topics" element={<StagedPage title="文化专题" />} />
        <Route path="workspace" element={<StagedPage title="研究工作台" />} />
        <Route path="search" element={<Navigate replace to="/discover" />} />
        <Route path="browse" element={<Navigate replace to="/discover" />} />
        <Route path="guide" element={<Navigate replace to="/discover" />} />
        <Route path="huaihe" element={<Navigate replace to="/topics" />} />
        <Route path="about" element={<Navigate replace to="/topics" />} />
      </Route>
    </Routes>
  )
}
