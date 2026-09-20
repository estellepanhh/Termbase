import { useState } from 'react'
import { transitionReviewCase } from '../../services/reviewWorkspaceApi'
import type { ReviewCaseDetail, TransitionAction } from '../../types/reviewWorkspace'

const actions: Record<ReviewCaseDetail['status'], Array<[TransitionAction, string]>> = {
  draft: [['submit', '提交审核']], pending_review: [['approve', '批准案例'], ['return', '退回修改']],
  approved: [['reopen', '重新打开'], ['archive', '归档案例']], archived: [['restore', '恢复案例']],
}

export default function StateActions({ detail, reviewer, onChanged }: { detail: ReviewCaseDetail; reviewer: string; onChanged: (detail?: ReviewCaseDetail) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function run(action: TransitionAction) {
    setBusy(true); setError('')
    try { onChanged(await transitionReviewCase(detail.public_id, { action, expected_revision_number: detail.current_revision_number, reviewer_name: reviewer, note: '' })) }
    catch (reason) { setError((reason as { response?: { status?: number } }).response?.status === 409 ? '案例状态或版本已变化，请刷新后重试' : '状态更新失败，请重试') }
    finally { setBusy(false) }
  }
  return <div className="state-actions">{actions[detail.status].map(([action, label]) => <button disabled={busy} key={action} onClick={() => void run(action)}>{label}</button>)}{error && <span role="alert">{error}</span>}</div>
}
