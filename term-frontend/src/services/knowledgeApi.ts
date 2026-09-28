import request from '../utils/request'
import type {
  PaginatedTerms,
  ProjectOverview,
  PublicTopicDetail,
  TermProfile,
  TermQuery,
  TopicSummary,
  AdminTerm,
  AdminTermInput,
  PaginatedAdminTerms,
  AdminAuditLog,
} from '../types/knowledge'

interface ListTermsResponse extends PaginatedTerms {
  code: number
}

interface TermProfileResponse {
  code: number
  data: TermProfile
}

interface TopicsResponse {
  code: number
  data: TopicSummary[]
}

interface TopicDetailResponse {
  code: number
  data: PublicTopicDetail
}

interface ProjectOverviewResponse {
  code: number
  data: ProjectOverview
}

export async function listTerms(query: TermQuery): Promise<PaginatedTerms> {
  const { pageSize, ...params } = query
  const response = await request.get<ListTermsResponse>('/api/v1/terms', {
    params: {
      ...params,
      ...(pageSize === undefined ? {} : { page_size: pageSize }),
    },
  })
  const { data, meta } = response as unknown as ListTermsResponse
  return { data, meta }
}

export async function getTerm(id: number): Promise<TermProfile> {
  const response = await request.get<TermProfileResponse>(`/api/v1/terms/${id}`)
  return (response as unknown as TermProfileResponse).data
}

export async function listTopics(): Promise<TopicSummary[]> {
  const response = await request.get<TopicsResponse>('/api/topics')
  return (response as unknown as TopicsResponse).data
}

export async function getTopic(slug: string): Promise<PublicTopicDetail> {
  const response = await request.get<TopicDetailResponse>(`/api/topics/${encodeURIComponent(slug)}`)
  return (response as unknown as TopicDetailResponse).data
}

export async function getProjectOverview(): Promise<ProjectOverview> {
  const response = await request.get<ProjectOverviewResponse>('/api/project/overview')
  return (response as unknown as ProjectOverviewResponse).data
}

export async function listAdminTerms(query: { q?: string; status?: string; page?: number } = {}): Promise<PaginatedAdminTerms> {
  const response = await request.get('/api/v1/admin/terms', { params: { ...query, page_size: 20 } })
  const payload = response as unknown as { data: AdminTerm[]; meta: PaginatedAdminTerms['meta'] }
  return { data: payload.data, meta: payload.meta }
}

export async function createAdminTerm(input: AdminTermInput): Promise<AdminTerm> {
  const response = await request.post('/api/v1/admin/terms', input)
  return (response as unknown as { data: AdminTerm }).data
}

export async function updateAdminTerm(id: number, input: AdminTermInput): Promise<AdminTerm> {
  const response = await request.put(`/api/v1/admin/terms/${id}`, input)
  return (response as unknown as { data: AdminTerm }).data
}

export async function deleteAdminTerm(id: number): Promise<void> {
  await request.delete(`/api/v1/admin/terms/${id}`)
}

export async function listAdminAuditLogs(): Promise<AdminAuditLog[]> {
  const response = await request.get('/api/v1/admin/audit-logs', { params: { limit: 10 } })
  return (response as unknown as { data: AdminAuditLog[] }).data
}
