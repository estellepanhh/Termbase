import request from '../utils/request'
import type {
  CreateReviewCaseInput, CreateReviewCaseResult, CreateRevisionInput,
  ReviewCaseDetail, ReviewCasePage, ReviewCaseQuery, ReviewRevision,
  TransitionCaseInput,
} from '../types/reviewWorkspace'

interface Envelope<T> { code: number; message: string; data: T }
interface ListEnvelope extends Envelope<ReviewCasePage['data']> { meta: ReviewCasePage['meta'] }

export async function createReviewCase(input: CreateReviewCaseInput): Promise<CreateReviewCaseResult> {
  const response = await request.post<Envelope<CreateReviewCaseResult>>('/api/v1/review-cases', input)
  return (response as unknown as Envelope<CreateReviewCaseResult>).data
}

export async function listReviewCases(query: ReviewCaseQuery): Promise<ReviewCasePage> {
  const response = await request.get<ListEnvelope>('/api/v1/review-cases', {
    params: {
      ...(query.page === undefined ? {} : { page: query.page }),
      ...(query.pageSize === undefined ? {} : { page_size: query.pageSize }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.termId === undefined ? {} : { term_id: query.termId }),
      ...(query.reviewer ? { reviewer: query.reviewer } : {}),
      ...(query.issueTag ? { issue_tag: query.issueTag } : {}),
      ...(query.q ? { q: query.q } : {}),
    },
  })
  const value = response as unknown as ListEnvelope
  return { data: value.data, meta: value.meta }
}

export async function getReviewCase(publicId: string): Promise<ReviewCaseDetail> {
  const response = await request.get<Envelope<ReviewCaseDetail>>(`/api/v1/review-cases/${publicId}`)
  return (response as unknown as Envelope<ReviewCaseDetail>).data
}

export async function createReviewRevision(publicId: string, input: CreateRevisionInput): Promise<ReviewRevision> {
  const response = await request.post<Envelope<ReviewRevision>>(`/api/v1/review-cases/${publicId}/revisions`, input)
  return (response as unknown as Envelope<ReviewRevision>).data
}

export async function transitionReviewCase(publicId: string, input: TransitionCaseInput): Promise<ReviewCaseDetail> {
  const response = await request.post<Envelope<ReviewCaseDetail>>(`/api/v1/review-cases/${publicId}/transitions`, input)
  return (response as unknown as Envelope<ReviewCaseDetail>).data
}

export async function downloadReviewCases(format: 'json' | 'csv', query: ReviewCaseQuery): Promise<{ blob: Blob; filename?: string }> {
  const response = await request.get('/api/v1/review-cases/export', {
    params: {
      format,
      ...(query.status ? { status: query.status } : {}),
      ...(query.termId === undefined ? {} : { term_id: query.termId }),
      ...(query.reviewer ? { reviewer: query.reviewer } : {}),
      ...(query.issueTag ? { issue_tag: query.issueTag } : {}),
      ...(query.q ? { q: query.q } : {}),
    },
    responseType: 'blob',
  }) as unknown as { data: Blob; headers?: Record<string, string> }
  const disposition = response.headers?.['content-disposition'] || ''
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1]
  return { blob: response.data, filename }
}
