const languageNames: Record<string, string> = {
  en: '英语', fr: '法语', es: '西班牙语', ar: '阿拉伯语', ru: '俄语',
  de: '德语', ja: '日语', ko: '韩语', pt: '葡萄牙语', it: '意大利语', zh: '中文',
}

const translationTypes: Record<string, string> = {
  recommended: '推荐译法', official: '正式译法', acceptable: '参考译法',
  historical: '历史译法', literal: '直译参考', explanatory: '解释性译法',
}

export function presentReviewStatus(status: string) {
  if (status === 'reviewed') return '已校订'
  if (status === 'pending' || status === 'unreviewed') return '待校订'
  return null
}

export function presentLanguage(code: string, name: string) {
  const normalizedCode = code.trim().toLowerCase()
  const normalizedName = name.trim()
  if (normalizedCode === 'und' || normalizedName === '未指定语言') return '其他语种'
  return normalizedName || languageNames[normalizedCode] || '其他语种'
}

export function presentTranslationType(type: string) {
  return translationTypes[type] ?? '参考译法'
}
