import type { ReactNode } from 'react'

export type KnowledgeGlyphKind = 'term' | 'person' | 'place' | 'culture' | 'herb' | 'child'

export default function KnowledgeGlyph({ kind, className = '' }: { kind: KnowledgeGlyphKind; className?: string }) {
  const paths: Record<KnowledgeGlyphKind, ReactNode> = {
    term: <><path d="M5 4.5h9.5A2.5 2.5 0 0 1 17 7v12H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M19 4.5h-1.5A2.5 2.5 0 0 0 15 7v12h1.5A2.5 2.5 0 0 1 19 21.5z" /><path d="M8 9h4M8 13h4" /></>,
    person: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" /></>,
    place: <><path d="M12 21s6-5.7 6-11a6 6 0 1 0-12 0c0 5.3 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></>,
    culture: <><path d="M3.5 8.5c3 0 3-2 6-2s3 2 6 2 3-2 5-2M3.5 13c3 0 3-2 6-2s3 2 6 2 3-2 5-2M3.5 17.5c3 0 3-2 6-2s3 2 6 2 3-2 5-2" /></>,
    herb: <><path d="M6 19c5.8-.7 9.6-4.7 11-12-7.3 1.2-11.2 5-11 12Z" /><path d="M6.5 18.5 15 10M10.5 14c-1.4-1-2.8-1.4-4.2-1.2M12.5 12c.2-1.4.8-2.7 1.8-3.8" /></>,
    child: <><path d="m4 14 8-8 8 8-8 7z" /><path d="M12 6v15M8.5 10.5 12 14l3.5-3.5M12 21c-1 1.5-2.2 1.5-3.5.5" /></>,
  }

  return (
    <svg aria-hidden="true" className={`knowledge-glyph knowledge-glyph--${kind} ${className}`.trim()} fill="none" focusable="false" viewBox="0 0 24 24">
      {paths[kind]}
    </svg>
  )
}
