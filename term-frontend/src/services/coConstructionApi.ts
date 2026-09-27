import request from '../utils/request'

export type TermSubmissionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

export type TermSubmission = {
  public_id: string
  preferred_name_zh: string
  definition_zh: string
  recommended_translation: string
  cultural_connotation: string
  source_text: string
  status: TermSubmissionStatus
  review_note: string
  term_id?: number | null
}

export type TermSubmissionInput = Pick<
  TermSubmission,
  'preferred_name_zh' | 'definition_zh' | 'recommended_translation' | 'cultural_connotation' | 'source_text'
>

export async function createSubmission(input: TermSubmissionInput): Promise<TermSubmission> {
  const response = await request.post('/api/v1/co-construction/submissions', input)
  return (response as unknown as { data: TermSubmission }).data
}

export async function listMySubmissions(): Promise<TermSubmission[]> {
  const response = await request.get('/api/v1/co-construction/submissions')
  return (response as unknown as { data: TermSubmission[] }).data
}

export async function updateSubmission(publicId: string, input: TermSubmissionInput): Promise<TermSubmission> {
  const response = await request.put(`/api/v1/co-construction/submissions/${publicId}`, input)
  return (response as unknown as { data: TermSubmission }).data
}

export async function withdrawSubmission(publicId: string): Promise<TermSubmission> {
  const response = await request.post(`/api/v1/co-construction/submissions/${publicId}/withdraw`)
  return (response as unknown as { data: TermSubmission }).data
}

export async function listAdminSubmissions(status = 'pending'): Promise<TermSubmission[]> {
  const response = await request.get('/api/v1/admin/co-construction/submissions', { params: { status } })
  return (response as unknown as { data: TermSubmission[] }).data
}

export async function approveSubmission(publicId: string): Promise<TermSubmission> {
  const response = await request.post(`/api/v1/admin/co-construction/submissions/${publicId}/approve`)
  return (response as unknown as { data: TermSubmission }).data
}

export async function rejectSubmission(publicId: string, reviewNote: string): Promise<TermSubmission> {
  const response = await request.post(`/api/v1/admin/co-construction/submissions/${publicId}/reject`, { review_note: reviewNote })
  return (response as unknown as { data: TermSubmission }).data
}
