import request from '../utils/request'
import type { TermFormData, ApiResponse, Term, HuaiheFigure, HuaiheHerb } from '../types/term'

/** 获取术语列表（分页） */
export function getTermList(page = 1, pageSize = 30) {
  return request.get<never, ApiResponse<Term[]>>('/api/term-list', {
    params: { page, pageSize },
  })
}

/** 搜索术语 */
export function searchTerm(word: string, page = 1, pageSize = 30) {
  return request.get<never, ApiResponse<Term[]>>('/api/search', {
    params: { word, page, pageSize },
  })
}

/** 多条件筛选 */
export function filterTerms(params: {
  culture?: string
  scene?: string
  level?: string
  page?: number
  pageSize?: number
}) {
  return request.get<never, ApiResponse<Term[]>>('/api/filter', { params })
}

/** 添加术语 */
export function addTerm(data: TermFormData) {
  return request.post<never, ApiResponse>('/api/terms', data)
}

/** 更新术语 */
export function updateTerm(id: number, data: TermFormData) {
  return request.put<never, ApiResponse>(`/api/terms/${id}`, data)
}

/** 删除术语 */
export function deleteTerm(id: number) {
  return request.delete<never, ApiResponse>(`/api/terms/${id}`)
}

/** 导入 Excel */
export function importExcel(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<never, ApiResponse>('/api/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 获取淮河术语 */
export function getHuaiheTerms(page = 1, pageSize = 6) {
  return request.get<never, ApiResponse<Term[]>>('/api/huaihe/terms', {
    params: { page, pageSize },
  })
}

/** 搜索淮河术语 */
export function searchHuaiheTerms(word: string, page = 1, pageSize = 6) {
  return request.get<never, ApiResponse<Term[]>>(
    '/api/huaihe/terms/search',
    { params: { word, page, pageSize } },
  )
}

/** 获取淮河名人 */
export function getHuaiheFigures() {
  return request.get<never, ApiResponse<HuaiheFigure[]>>(
    '/api/huaihe/figures',
  )
}

/** 获取淮河中药材 */
export function getHuaiheHerbs(page = 1, pageSize = 6) {
  return request.get<never, ApiResponse<HuaiheHerb[]>>('/api/huaihe/herbs', {
    params: { page, pageSize },
  })
}

/** 搜索淮河中药材 */
export function searchHuaiheHerbs(word: string, page = 1, pageSize = 6) {
  return request.get<never, ApiResponse<HuaiheHerb[]>>(
    '/api/huaihe/herbs/search',
    { params: { word, page, pageSize } },
  )
}

/** AI 流式对话（返回原始 Response） */
export function chatStream(message: string) {
  return fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
}
