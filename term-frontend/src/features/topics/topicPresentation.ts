export type TopicInterfaceLanguage = 'zh' | 'en'

const entryTypeLabels: Record<TopicInterfaceLanguage, Record<string, string>> = {
  zh: {
    term: '核心术语', person: '文化人物', place: '文化地点', culture: '文化条目', herb: '淮河本草',
  },
  en: {
    term: 'Core terms', person: 'Cultural figures', place: 'Cultural places', culture: 'Cultural records', herb: 'Huaihe materia medica',
  },
}

export function labelForEntryType(entryType: string, language: TopicInterfaceLanguage) {
  return entryTypeLabels[language][entryType] ?? (language === 'zh' ? '专题资料' : 'Topic records')
}
import type { TopicEntry } from '../../types/knowledge'


export function entrySearchText(item: TopicEntry) {
  const fieldText = Object.entries(item.fields ?? {}).flatMap(([key, value]) => [key, String(value)]).join(' ')
  const termText = item.term
    ? [
      item.term.preferred_name_zh,
      item.term.definition_zh,
      item.term.term_level,
      item.term.culture_category,
      item.term.recommended_translation,
    ].filter(Boolean).join(' ')
    : ''
  return `${item.title} ${item.entry_type} ${fieldText} ${termText}`.toLowerCase()
}
