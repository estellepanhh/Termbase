import { useState } from 'react'
import { downloadReviewCases } from '../../services/reviewWorkspaceApi'
import type { ReviewCaseQuery } from '../../types/reviewWorkspace'
import './workspace-export.css'

function safeFilename(format: 'json' | 'csv') { return `review-cases-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}` }

export default function WorkspaceExportActions({ query }: { query: ReviewCaseQuery }) {
  const [loading, setLoading] = useState<'json' | 'csv'>(); const [error, setError] = useState('')
  async function download(format: 'json' | 'csv') {
    setLoading(format); setError('')
    try {
      const result = await downloadReviewCases(format, query); const url = URL.createObjectURL(result.blob)
      const link = document.createElement('a'); link.href = url; link.download = result.filename || safeFilename(format); link.click(); URL.revokeObjectURL(url)
    } catch { setError('导出失败，请稍后重试') } finally { setLoading(undefined) }
  }
  return <div className="workspace-export"><span>研究数据导出</span><button disabled={!!loading} onClick={() => void download('json')}>{loading === 'json' ? '导出中…' : '导出 JSON'}</button><button disabled={!!loading} onClick={() => void download('csv')}>{loading === 'csv' ? '导出中…' : '导出 CSV'}</button>{error && <span role="alert">{error}</span>}</div>
}
