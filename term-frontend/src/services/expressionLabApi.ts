import type { ExpressionAnalysis, ExpressionAnalysisResponse, ExpressionTaskInput } from '../types/expressionLab'
import request from '../utils/request'

export async function analyzeExpression(input: ExpressionTaskInput): Promise<ExpressionAnalysis> {
  const response = await request.post<ExpressionAnalysisResponse>(
    '/api/v1/expression-lab/analyze',
    input,
    { timeout: 60_000 },
  )
  return (response as unknown as ExpressionAnalysisResponse).data
}
