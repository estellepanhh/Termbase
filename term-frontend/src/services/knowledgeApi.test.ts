import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from '../utils/request'
import { getTerm, listTerms } from './knowledgeApi'

vi.mock('../utils/request', () => ({
  default: { get: vi.fn() },
}))

describe('knowledgeApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends stable discovery query parameters without manually encoding Unicode', async () => {
    vi.mocked(request.get).mockResolvedValue({
      data: [],
      meta: { page: 1, page_size: 20, total: 0 },
    })

    await listTerms({ q: '和', level: '本源层', page: 1, pageSize: 20 })

    expect(request.get).toHaveBeenCalledWith('/api/v1/terms', {
      params: { q: '和', level: '本源层', page: 1, page_size: 20 },
    })
  })

  it('omits optional discovery parameters that are not provided', async () => {
    vi.mocked(request.get).mockResolvedValue({
      data: [],
      meta: { page: 1, page_size: 20, total: 0 },
    })

    await listTerms({})

    expect(request.get).toHaveBeenCalledWith('/api/v1/terms', { params: {} })
  })

  it('returns paginated term data from the unwrapped API response', async () => {
    const response = {
      data: [{ id: 7, preferred_name_zh: '和' }],
      meta: { page: 2, page_size: 10, total: 11 },
    }
    vi.mocked(request.get).mockResolvedValue(response)

    await expect(listTerms({ page: 2, pageSize: 10 })).resolves.toEqual(response)
  })

  it('requests a term profile by id and returns the unwrapped profile', async () => {
    const response = { data: { id: 7, preferred_name_zh: '和' } }
    vi.mocked(request.get).mockResolvedValue(response)

    await expect(getTerm(7)).resolves.toEqual(response.data)
    expect(request.get).toHaveBeenCalledWith('/api/v1/terms/7')
  })

  it('propagates request failures', async () => {
    const error = new Error('network unavailable')
    vi.mocked(request.get).mockRejectedValue(error)

    await expect(listTerms({ q: '和' })).rejects.toThrow('network unavailable')
  })
})
