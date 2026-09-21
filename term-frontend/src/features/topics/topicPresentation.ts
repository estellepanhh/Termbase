const entryTypeLabels: Record<string, string> = {
  term: '核心术语',
  person: '文化人物',
  place: '文化地点',
  culture: '文化条目',
  herb: '淮河本草',
}

export function labelForEntryType(entryType: string) {
  return entryTypeLabels[entryType] ?? '专题资料'
}
