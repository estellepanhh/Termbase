import { useState, type FormEvent } from 'react'

export type DiscoveryFilterValues = {
  q: string
  level: string
  culture: string
  language: string
}

type DiscoveryFiltersProps = {
  values: DiscoveryFilterValues
  onSearch: (query: string) => void
  onFilterChange: (filter: Exclude<keyof DiscoveryFilterValues, 'q'>, value: string) => void
}

const levels = ['核心层', '拓展层', '本源层']
const cultures = ['中华优秀传统文化', '革命文化', '社会主义先进文化']
const languages = ['英语', '法语', '西班牙语', '阿拉伯语', '俄语']

export default function DiscoveryFilters({ values, onSearch, onFilterChange }: DiscoveryFiltersProps) {
  const [query, setQuery] = useState(values.q)

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(query.trim())
  }

  return (
    <section aria-label="术语检索条件" className="discovery-filters">
      <form className="discovery-search" onSubmit={submitSearch}>
        <label htmlFor="discovery-search">搜索术语</label>
        <div className="discovery-search__controls">
          <input
            id="discovery-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入术语、概念或译名"
            type="search"
            value={query}
          />
          <button type="submit">搜索</button>
        </div>
      </form>

      <div className="discovery-filter-grid">
        <label>
          术语层级
          <select onChange={(event) => onFilterChange('level', event.target.value)} value={values.level}>
            <option value="">全部层级</option>
            {levels.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </label>
        <label>
          文化分类
          <select onChange={(event) => onFilterChange('culture', event.target.value)} value={values.culture}>
            <option value="">全部分类</option>
            {cultures.map((culture) => <option key={culture} value={culture}>{culture}</option>)}
          </select>
        </label>
        <label>
          语种
          <select onChange={(event) => onFilterChange('language', event.target.value)} value={values.language}>
            <option value="">全部语种</option>
            {languages.map((language) => <option key={language} value={language}>{language}</option>)}
          </select>
        </label>
      </div>
    </section>
  )
}
