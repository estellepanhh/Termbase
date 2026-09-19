import request from '../utils/request'
import type { PaginatedTerms, TermProfile, TermQuery } from '../types/knowledge'

export async function listTerms(query: TermQuery): Promise<PaginatedTerms> {
  const { pageSize, ...params } = query
  const response = await request.get<PaginatedTerms>('/api/v1/terms', {
    params: {
      ...params,
      ...(pageSize === undefined ? {} : { page_size: pageSize }),
    },
  })
  return response as unknown as PaginatedTerms
}

export async function getTerm(id: number): Promise<TermProfile> {
  const response = await request.get<{ data: TermProfile }>(`/api/v1/terms/${id}`)
  return (response as unknown as { data: TermProfile }).data
}
