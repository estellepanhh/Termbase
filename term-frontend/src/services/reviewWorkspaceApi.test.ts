import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from '../utils/request'
import { createReviewCase, createReviewRevision, getReviewCase, listReviewCases, transitionReviewCase } from './reviewWorkspaceApi'

vi.mock('../utils/request', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

describe('reviewWorkspaceApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates and unwraps an idempotent review case response', async () => {
    const input = { title: '案例', term_ids: [7], analysis: { request_id: 'r' } } as never
    const value = { case: { public_id: 'case-1' }, created: true }
    vi.mocked(request.post).mockResolvedValue({ code: 201, message: '案例已保存', data: value })
    await expect(createReviewCase(input)).resolves.toBe(value)
    expect(request.post).toHaveBeenCalledWith('/api/v1/review-cases', input)
  })

  it('maps list query names and unwraps detail/write responses', async () => {
    vi.mocked(request.get).mockResolvedValueOnce({ code: 200, data: [], meta: { page: 2, page_size: 10, total: 0, stats: {} } })
    await listReviewCases({ page: 2, pageSize: 10, status: 'draft', termId: 7, reviewer: 'Li', issueTag: 'other', q: '和' })
    expect(request.get).toHaveBeenCalledWith('/api/v1/review-cases', { params: { page: 2, page_size: 10, status: 'draft', term_id: 7, reviewer: 'Li', issue_tag: 'other', q: '和' } })

    vi.mocked(request.get).mockResolvedValueOnce({ code: 200, data: { public_id: 'case-1' } })
    await getReviewCase('case-1')
    expect(request.get).toHaveBeenLastCalledWith('/api/v1/review-cases/case-1')

    vi.mocked(request.post).mockResolvedValueOnce({ code: 201, data: { revision_number: 2 } })
    await createReviewRevision('case-1', { expected_revision_number: 1 } as never)
    expect(request.post).toHaveBeenLastCalledWith('/api/v1/review-cases/case-1/revisions', { expected_revision_number: 1 })

    vi.mocked(request.post).mockResolvedValueOnce({ code: 200, data: { status: 'approved' } })
    await transitionReviewCase('case-1', { action: 'approve' } as never)
    expect(request.post).toHaveBeenLastCalledWith('/api/v1/review-cases/case-1/transitions', { action: 'approve' })
  })
})
