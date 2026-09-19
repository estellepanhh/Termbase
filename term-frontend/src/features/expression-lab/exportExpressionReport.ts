import type { ExpressionAnalysis } from '../../types/expressionLab'

const labels: Record<string, string> = {
  academic: '学术受众', international_media: '国际媒体', overseas_youth: '海外青年', general_public: '普通公众',
  academic_paper: '学术论文', policy_text: '政策文本', news_media: '新闻传播', cultural_exhibition: '文化展陈', social_media: '社交媒体',
  formal: '正式', explanatory: '解释性', concise: '简洁', accessible: '通俗',
  general_english: '通用英语', british_english: '英式英语', american_english: '美式英语',
}

export function toExpressionMarkdown(analysis: ExpressionAnalysis): string {
  const { input_summary: input, report } = analysis
  const alternatives = report.alternatives.map((item, index) =>
    `### ${index + 1}. ${item.text}\n\n- 适用：${item.best_for}\n- 取舍：${item.tradeoff}`,
  ).join('\n\n') || '无'
  const usages = report.term_usage.map((item) =>
    `- 术语 #${item.term_id}：${item.adopted_translation} — ${item.explanation}`,
  ).join('\n') || '无'
  const risks = report.cultural_risks.map((item) =>
    `- [${item.level}] ${item.issue}；建议：${item.recommendation}`,
  ).join('\n') || '无'
  const references = report.references.map((item) =>
    `- ${item.title}${item.organization ? `（${item.organization}）` : ''}${item.url ? ` — ${item.url}` : ''}：${item.usage}`,
  ).join('\n') || '无有效引用'

  return `# 跨文化表达分析报告

> AI生成、尚未人工复核。内容仅供研究与编辑参考。

## 传播任务

- 受众：${labels[input.audience] ?? input.audience}
- 场景：${labels[input.scenario] ?? input.scenario}
- 风格：${labels[input.style] ?? input.style}
- 英语区域：${labels[input.locale] ?? input.locale}
- 生成时间：${analysis.generated_at}

## 中文原文

${input.source_text}

## 推荐表达

**${report.recommended.text}**

${report.recommended.rationale}

策略：${report.recommended.strategy.join('、')}

## 备选表达

${alternatives}

## 术语采用

${usages}

## 文化风险

${risks}

## 参考来源

${references}

## 局限与复核

复核优先级：${report.review_priority}

${report.limitations.map((item) => `- ${item}`).join('\n')}

请求编号：${analysis.request_id}
`
}

export function toExpressionJson(analysis: ExpressionAnalysis): string {
  return JSON.stringify(analysis, null, 2)
}

export function downloadTextFile(
  analysis: ExpressionAnalysis,
  content: string,
  extension: 'md' | 'json',
): void {
  const safeId = analysis.request_id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'report'
  const timestamp = analysis.generated_at.replace(/[^0-9]/g, '').slice(0, 14)
  const mime = extension === 'md' ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8'
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `expression-${safeId}-${timestamp}.${extension}`
  anchor.click()
  URL.revokeObjectURL(url)
}
