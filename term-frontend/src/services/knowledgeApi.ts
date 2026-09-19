import request from '../utils/request'
import type { PaginatedTerms, TermProfile, TermQuery } from '../types/knowledge'

interface ListTermsResponse extends PaginatedTerms {
  code: number
}

interface TermProfileResponse {
  code: number
  data: TermProfile
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
