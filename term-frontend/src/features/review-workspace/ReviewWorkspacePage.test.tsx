import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/routes'
import * as api from '../../services/reviewWorkspaceApi'
import '../../locales'
import { detail, summary } from './reviewWorkspaceFixtures'

vi.mock('../../services/reviewWorkspaceApi', () => ({
  listReviewCases: vi.fn(), getReviewCase: vi.fn(), createReviewRevision: vi.fn(), transitionReviewCase: vi.fn(),
}))

describe('ReviewWorkspacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.listReviewCases).mockResolvedValue({ data: [summary], meta: { page: 1, page_size: 20, total: 1, stats: { draft: 1, pending_review: 0, approved: 0, archived: 0, total: 1, average_revision_count: 2 } } })
    vi.mocked(api.getReviewCase).mockResolvedValue(detail)
  })

  it('replaces the placeholder with overview, filters, queue and deep-linked detail', async () => {
    render(<MemoryRouter initialEntries={['/workspace?case=case-1']}><AppRoutes /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: '人工评审与案例工作台' })).toBeInTheDocument()
    expect(screen.queryByText('该研究功能处于下一阶段建设')).not.toBeInTheDocument()
    expect((await screen.findAllByText('和而不同传播案例')).length).toBeGreaterThan(0)
    expect(screen.getByText('草稿案例')).toBeInTheDocument()
    expect(await screen.findByText('Harmony in diversity')).toBeInTheDocument()
    expect(api.getReviewCase).toHaveBeenCalledWith('case-1')
  })

  it('maps filters to API queries and retains the queue during refresh', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/workspace']}><AppRoutes /></MemoryRouter>)
    await screen.findByText('和而不同传播案例')
    await user.selectOptions(screen.getByLabelText('案例状态'), 'draft')
    await waitFor(() => expect(api.listReviewCases).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'draft', page: 1, pageSize: 20 })))
    expect(screen.getByText('和而不同传播案例')).toBeInTheDocument()
  })

  it('selects a queue item and loads its detail', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/workspace']}><AppRoutes /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: /打开案例 和而不同传播案例/ }))
    expect((await screen.findAllByText('Human reviewed expression')).length).toBeGreaterThan(0)
  })
})
