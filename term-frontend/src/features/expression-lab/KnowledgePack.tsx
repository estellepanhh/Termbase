import type { TermProfile } from '../../types/knowledge'

export default function KnowledgePack({ terms }: { terms: TermProfile[] }) {
  if (!terms.length) return <div className="knowledge-empty">尚未选择术语。先检索并加入知识依据。</div>
  return <div className="knowledge-pack">{terms.map((term) => <details key={term.id} open><summary><span>{term.preferred_name_zh}</span><small>{term.term_level || '未分类'} · {term.culture_category || '未分类'} · {term.data_quality || '待复核'}</small></summary><div className="knowledge-pack__body"><p>{term.definition_zh}</p>{term.recommended_translation ? <p><b>推荐英语：</b>{term.recommended_translation.text}</p> : <p>暂无推荐英语译法</p>}<p><b>来源：</b>{term.sources.length ? term.sources.map((source) => source.title).join('、') : '暂无来源摘要'}</p></div></details>)}</div>
}
