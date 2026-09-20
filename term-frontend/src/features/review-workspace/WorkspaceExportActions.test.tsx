import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import * as api from '../../services/reviewWorkspaceApi'
import WorkspaceExportActions from './WorkspaceExportActions'

vi.mock('../../services/reviewWorkspaceApi', () => ({ downloadReviewCases: vi.fn() }))

describe('WorkspaceExportActions', () => {
  it('downloads the selected format with active filters', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.mocked(api.downloadReviewCases).mockResolvedValue({ blob: new Blob(['[]']), filename: 'cases.json' })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<WorkspaceExportActions query={{ status: 'approved', reviewer: 'Li', q: '和' }} />)
    await userEvent.click(screen.getByRole('button', { name: '导出 JSON' }))
    await waitFor(() => expect(api.downloadReviewCases).toHaveBeenCalledWith('json', { status: 'approved', reviewer: 'Li', q: '和' }))
    expect(click).toHaveBeenCalled(); createObjectURL.mockRestore(); revokeObjectURL.mockRestore(); click.mockRestore()
  })
})
