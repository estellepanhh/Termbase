import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../services/reviewWorkspaceApi'
import CaseReviewPanel from './CaseReviewPanel'
import { detail } from './reviewWorkspaceFixtures'

vi.mock('../../services/reviewWorkspaceApi', () => ({ createReviewRevision: vi.fn(), transitionReviewCase: vi.fn() }))

describe('CaseReviewPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders immutable AI text, editable human revision, tags and history safely', () => {
    render(<MemoryRouter><CaseReviewPanel detail={detail} onChanged={() => {}} /></MemoryRouter>)
    expect(screen.getByText('Harmony in diversity')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Human reviewed expression')).toBeInTheDocument()
    expect(screen.getByLabelText('语域不符')).toBeChecked()
    expect(screen.getByRole('button', { name: '版本 1' })).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })

  it('saves an append-only revision with the visible version', async () => {
    vi.mocked(api.createReviewRevision).mockResolvedValue({ ...detail.current_revision, revision_number: 3 })
    const changed = vi.fn()
    const user = userEvent.setup()
    render(<MemoryRouter><CaseReviewPanel detail={detail} onChanged={changed} /></MemoryRouter>)
    await user.clear(screen.getByLabelText('人工定稿'))
    await user.type(screen.getByLabelText('人工定稿'), 'New final expression')
    await user.click(screen.getByRole('button', { name: '保存新修订' }))
    await waitFor(() => expect(api.createReviewRevision).toHaveBeenCalledWith('case-1', expect.objectContaining({ expected_revision_number: 2, final_expression: 'New final expression', reviewer_name: 'Reviewer A' })))
    expect(changed).toHaveBeenCalled()
  })

  it('shows only legal state action and preserves form on a conflict', async () => {
    vi.mocked(api.createReviewRevision).mockRejectedValue(Object.assign(new Error('conflict'), { response: { status: 409 } }))
    const user = userEvent.setup()
    render(<MemoryRouter><CaseReviewPanel detail={detail} onChanged={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('button', { name: '提交审核' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '批准案例' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('评审意见'), '保留内容')
    await user.click(screen.getByRole('button', { name: '保存新修订' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('案例已有新版本，请刷新后再编辑')
    expect((screen.getByLabelText('评审意见') as HTMLTextAreaElement).value).toContain('保留内容')
  })
})
