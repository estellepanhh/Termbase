import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../services/knowledgeApi'
import * as coApi from '../../services/coConstructionApi'
import TermManagementPage from './TermManagementPage'

vi.mock('../../services/knowledgeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/knowledgeApi')>()
  return { ...actual, listAdminTerms: vi.fn(), createAdminTerm: vi.fn(), updateAdminTerm: vi.fn(), deleteAdminTerm: vi.fn(), listAdminAuditLogs: vi.fn() }
})

vi.mock('../../services/coConstructionApi', () => ({
  listAdminSubmissions: vi.fn(),
  approveSubmission: vi.fn(),
  rejectSubmission: vi.fn(),
}))

const term = { id: 1, preferred_name_zh: '和而不同', definition_zh: '承认差异并和谐共处', cultural_connotation: '和谐不是同一', term_level: '本源层', culture_category: '传统文化', status: 'published' as const, updated_at: '2026-09-27T10:00:00' }
const submission = { public_id: 'sub-1', preferred_name_zh: '天下为公', definition_zh: '公共价值', recommended_translation: 'the world belongs to all', cultural_connotation: '', source_text: '礼记', status: 'pending' as const, review_note: '', term_id: null }
const auditLog = { id: 1, actor_username: 'admin', action: 'term.archive', target_type: 'term', target_id: '1', summary: '下架术语：和而不同', created_at: '2026-09-28T10:00:00' }

describe('TermManagementPage', () => {
  beforeEach(() => {
    vi.mocked(api.listAdminTerms).mockResolvedValue({ data: [term], meta: { page: 1, page_size: 20, total: 1 } })
    vi.mocked(api.createAdminTerm).mockResolvedValue({ ...term, id: 2, preferred_name_zh: '天下大同', status: 'draft' })
    vi.mocked(api.updateAdminTerm).mockResolvedValue({ ...term, preferred_name_zh: '和而不同（修订）' })
    vi.mocked(api.deleteAdminTerm).mockResolvedValue(undefined)
    vi.mocked(api.listAdminAuditLogs).mockResolvedValue([auditLog])
    vi.mocked(coApi.listAdminSubmissions).mockResolvedValue([submission])
    vi.mocked(coApi.approveSubmission).mockResolvedValue({ ...submission, status: 'approved', term_id: 9 })
    vi.mocked(coApi.rejectSubmission).mockResolvedValue({ ...submission, status: 'rejected', review_note: '来源不足' })
  })

  it('lists terms and exposes create edit publish-state and delete actions', async () => {
    render(<MemoryRouter><TermManagementPage /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: '术语管理台' })).toBeInTheDocument()
    const row = await screen.findByRole('article', { name: '术语：和而不同' })
    expect(within(row).getByText('已发布')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: '编辑和而不同' })).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: '删除和而不同' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增术语' })).toBeInTheDocument()
  })

  it('creates a draft term through the management form', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TermManagementPage /></MemoryRouter>)
    await screen.findByText('和而不同')
    await user.click(screen.getByRole('button', { name: '新增术语' }))
    await user.type(screen.getByLabelText('中文术语名'), '天下大同')
    await user.type(screen.getByLabelText('中文定义'), '共同理想')
    await user.click(screen.getByRole('button', { name: '保存术语' }))
    await waitFor(() => expect(api.createAdminTerm).toHaveBeenCalledWith(expect.objectContaining({ preferred_name_zh: '天下大同', definition_zh: '共同理想', status: 'draft' })))
  })

  it('reviews co-construction submissions without removing term CRUD', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><TermManagementPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: '共建审核' })).toBeInTheDocument()
    expect(screen.getByText('天下为公')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增术语' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '通过天下为公' }))

    await waitFor(() => expect(coApi.approveSubmission).toHaveBeenCalledWith('sub-1'))
  })

  it('shows recent administrator operation records', async () => {
    render(<MemoryRouter><TermManagementPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: '操作记录' })).toBeInTheDocument()
    expect(screen.getByText('下架术语：和而不同')).toBeInTheDocument()
    expect(screen.getByText(/admin/)).toBeInTheDocument()
  })
})
