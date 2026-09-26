import request from '../utils/request'
import type {
  PaginatedTerms,
  ProjectOverview,
  PublicTopicDetail,
  TermProfile,
  TermQuery,
  TopicSummary,
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
