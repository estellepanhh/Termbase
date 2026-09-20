import type { TranslationDetail } from '../../types/knowledge'

type TranslationPanelProps = {
  translations: TranslationDetail[]
}

const translationTypeLabels: Record<string, string> = {
  recommended: '推荐译法',
  acceptable: '可用译法',
  historical: '历史译法',
  discouraged: '不建议使用',
}

function reviewStatusLabel(status: string) {
  if (status === 'reviewed') return '已审校'
  if (status === 'pending') return '待审核'
  return status || '未标注审核状态'
}

function TranslationList({ translations, label }: { translations: TranslationDetail[]; label: string }) {
  if (!translations.length) return null

  return (
    <div className="translation-panel__group">
      <h3>{label}</h3>
      <ul className="translation-panel__list">
        {translations.map((translation) => (
          <li className="translation-panel__item" key={`${translation.language_code}-${translation.text}`}>
            <div className="translation-panel__item-header">
              <span className="translation-panel__language">{translation.language_name_zh || translation.language_code}</span>
              <span className="translation-panel__review">状态：{reviewStatusLabel(translation.review_status)}</span>
            </div>
            <p className="translation-panel__type">{translationTypeLabels[translation.translation_type] ?? '其他译法'}</p>
            <p className="translation-panel__text">{translation.text}</p>
            {translation.note ? <p className="translation-panel__note">{translation.note}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function TranslationPanel({ translations }: TranslationPanelProps) {
  if (!translations.length) return null

  const recommended = translations.filter((translation) => translation.translation_type === 'recommended')
  const alternatives = translations.filter((translation) => translation.translation_type !== 'recommended')

  return (
    <section aria-labelledby="translations-title" className="term-profile-panel translation-panel" id="translations">
      <div className="term-profile-panel__heading">
        <p className="term-profile-panel__eyebrow">TRANSLATIONS</p>
        <h2 id="translations-title">多语译法</h2>
      </div>
      <TranslationList label="推荐译法" translations={recommended} />
      <TranslationList label="其他译法" translations={alternatives} />
    </section>
  )
}
