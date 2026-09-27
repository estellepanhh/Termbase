import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import request from '../utils/request'
import type { PaginatedTerms, TermProfile } from '../types/knowledge'
import { getProjectOverview, getTerm, getTopic, listTerms, listTopics } from './knowledgeApi'

const termSummary = {
  id: 7,
  preferred_name_zh: '和而不同',
  definition_zh: '承认差异并追求和谐共处',
  term_level: '本源层',
  culture_category: '中华优秀传统文化',
  data_quality: 'legacy_unreviewed',
  recommended_translation: {
    language_code: 'en',
    language_name_zh: '英语',
    text: 'harmony in diversity',
    translation_type: 'recommended',
    authority_level: 'official',
    review_status: 'approved',
  },
  language_count: 2,
  source_count: 1,
} as const

const paginatedTerms: PaginatedTerms = {
  data: [termSummary],
  meta: { page: 2, page_size: 10, total: 11 },
}

const termProfile: TermProfile = {
  ...termSummary,
  cultural_connotation: '和谐不是同一',
  names: [{ name: '和而不同', name_type: 'preferred' }],
  translations: [{
    ...termSummary.recommended_translation,
    region: null,
    note: null,
    contexts: [{
      context_code: 'diplomacy',
      context_name_zh: '外交',
      audience: 'international',
      style: 'formal',
      description: '外交交流中的表述',
      recommendation_level: 'recommended',
      example: '各国应和而不同。',
      note: null,
    }],
  }],
  sources: [{
    id: 3,
    title: '论语',
    organization: null,
    published_at: null,
    language_code: 'zh',
    source_type: 'classical',
    url: null,
    citation: null,
    authority_level: null,
    summary: null,
    legacy_value: null,
    evidence: [{
      id: 4,
      translation_id: null,
      original_excerpt: '君子和而不同',
      translated_excerpt: 'The superior person seeks harmony.',
      locator: '子路篇',
      note: null,
    }],
  }],
  contexts: [{
    context_code: 'education',
    context_name_zh: '教育',
    audience: 'students',
    style: 'plain',
    description: '课堂中的解释',
    explanation: '尊重差异。',
    example: '同学之间应和而不同。',
    note: null,
  }],
  cultural_notes: [{
    target_culture: '英语文化',
    difference_summary: '强调包容差异',
    literal_risk: '误解为妥协',
    misconception: '认为没有原则',
    recommendation: '说明其价值取向',
  }],
  relations: [{
    direction: 'outgoing',
    relation_type: 'related',
    source_term_id: 7,
    source_term_name_zh: '和而不同',
    target_term_id: 8,
    target_term_name_zh: '和谐',
  }],
  topics: [{
    slug: 'harmony',
    title: '和合文化',
    summary: null,
    entry_type: 'term',
    item_title: '和而不同',
  }],
}

const topicSummary = {
  slug: 'huaihe-culture',
  title: '淮河文化',
  summary: '淮河流域文化专题',
  item_count: 2,
  term_count: 1,
  entry_type_counts: { person: 1, term: 1 },
}

const topicDetail = {
  ...topicSummary,
  items: [{
    id: 12,
    entry_type: 'term',
    title: '淮河文化',
    fields: {},
    term: {
      id: 8,
      preferred_name_zh: '淮河文化',
      definition_zh: '淮河流域形成的地域文化传统。',
      term_level: '地域层',
      culture_category: '地方文化',
      recommended_translation: 'Huaihe culture',
    },
  }],
}

function successAdapter(payload: unknown): AxiosAdapter {
  return async (config) => ({
    data: payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
}

describe('knowledgeApi', () => {
  let originalAdapter: typeof request.defaults.adapter

  beforeEach(() => {
    localStorage.clear()
    originalAdapter = request.defaults.adapter
  })

  afterEach(() => {
    request.defaults.adapter = originalAdapter
  })

  it('serializes Unicode discovery parameters and omits absent parameters', async () => {
    const adapter = vi.fn(successAdapter({ code: 200, ...paginatedTerms }))
    request.defaults.adapter = adapter

    await expect(listTerms({ q: '和', level: '本源层', page: 1, pageSize: 20 }))
      .resolves.toEqual(paginatedTerms)
    await expect(listTerms({})).resolves.toEqual(paginatedTerms)

    const firstConfig = adapter.mock.calls[0][0] as InternalAxiosRequestConfig
    const secondConfig = adapter.mock.calls[1][0] as InternalAxiosRequestConfig
    expect(request.getUri(firstConfig)).toBe(
      '/api/v1/terms?q=%E5%92%8C&level=%E6%9C%AC%E6%BA%90%E5%B1%82&page=1&page_size=20',
    )
    expect(request.getUri(secondConfig)).toBe('/api/v1/terms')
  })

  it('returns the complete paginated list payload after interceptor unwrapping', async () => {
    request.defaults.adapter = successAdapter({ code: 200, ...paginatedTerms })

    await expect(listTerms({ page: 2, pageSize: 10 })).resolves.toEqual(paginatedTerms)
  })

  it('accepts created responses from admin APIs after interceptor unwrapping', async () => {
    request.defaults.adapter = successAdapter({ code: 201, data: termSummary })

    const { createAdminTerm } = await import('./knowledgeApi')
    await expect(createAdminTerm({
      preferred_name_zh: '和而不同',
      definition_zh: '承认差异并追求和谐共处',
      cultural_connotation: '',
      term_level: '本源层',
      culture_category: '中华优秀传统文化',
      status: 'draft',
    })).resolves.toEqual(termSummary)
  })

  it('returns a contract-shaped term profile after interceptor unwrapping', async () => {
    const adapter = vi.fn(successAdapter({ code: 200, data: termProfile }))
    request.defaults.adapter = adapter

    await expect(getTerm(7)).resolves.toEqual(termProfile)
    expect(request.getUri(adapter.mock.calls[0][0] as InternalAxiosRequestConfig)).toBe('/api/v1/terms/7')
  })

  it('loads published cultural topic summaries', async () => {
    const adapter = vi.fn(successAdapter({ code: 200, data: [topicSummary] }))
    request.defaults.adapter = adapter

    await expect(listTopics()).resolves.toEqual([topicSummary])
    expect(request.getUri(adapter.mock.calls[0][0] as InternalAxiosRequestConfig)).toBe('/api/topics')
  })

  it('encodes a cultural topic slug when loading its detail', async () => {
    const adapter = vi.fn(successAdapter({ code: 200, data: topicDetail }))
    request.defaults.adapter = adapter

    await expect(getTopic('huaihe culture')).resolves.toEqual(topicDetail)
    expect(request.getUri(adapter.mock.calls[0][0] as InternalAxiosRequestConfig)).toBe('/api/topics/huaihe%20culture')
  })

  it('loads the public project overview', async () => {
    const overview = {
      term_count: 48,
      translation_count: 76,
      language_count: 4,
      published_topic_count: 1,
    }
    const adapter = vi.fn(successAdapter({ code: 200, data: overview }))
    request.defaults.adapter = adapter

    await expect(getProjectOverview()).resolves.toEqual(overview)
    expect(request.getUri(adapter.mock.calls[0][0] as InternalAxiosRequestConfig)).toBe('/api/project/overview')
  })

  it('adds Authorization bearer token to admin API requests', async () => {
    localStorage.setItem('termbase-auth', JSON.stringify({
      token: 'admin-token',
      user: { username: 'admin', role: 'admin', display_name: '管理员' },
    }))
    const adapter = vi.fn(successAdapter({ code: 200, data: [], meta: { page: 1, page_size: 20, total: 0 } }))
    request.defaults.adapter = adapter

    const { listAdminTerms } = await import('./knowledgeApi')
    await listAdminTerms({ page: 1 })

    const config = adapter.mock.calls[0][0] as InternalAxiosRequestConfig
    expect(config.headers.Authorization).toBe('Bearer admin-token')
  })

  it('propagates a non-2xx Axios response through the real request interceptor', async () => {
    request.defaults.adapter = async (config) => {
      const response = {
        data: { code: 404, message: '术语不存在或尚未发布' },
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config,
      }
      throw new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', config, undefined, response)
    }

    await expect(listTerms({ q: 'missing' })).rejects.toMatchObject({
      code: 'ERR_BAD_REQUEST',
      response: { status: 404 },
    })
  })

  it('accepts the v1 message field when unwrapping errors', async () => {
    request.defaults.adapter = async (config) => {
      const response = {
        data: { code: 404, message: '术语不存在或尚未发布' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
      return response
    }

    await expect(getTerm(999)).rejects.toThrow('术语不存在或尚未发布')
  })
})
