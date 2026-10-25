import type { TranslationDetail } from '../../types/knowledge'
import { presentLanguage, presentReviewStatus, presentTranslationType } from './translationPresentation'

type TranslationPanelProps = {
  translations: TranslationDetail[]
}

function TranslationList({ translations }: { translations: TranslationDetail[] }) {
  return (
      <ul aria-label="多语译法阅读流" className="translation-panel__list">
        {translations.map((translation) => {
          const reviewStatus = presentReviewStatus(translation.review_status)
          return (
            <li className="translation-panel__item" key={`${translation.language_code}-${translation.text}`}>
              <div className="translation-panel__language-line">
                <i aria-hidden="true" className="translation-panel__language-dot" />
                <span className="translation-panel__language">{presentLanguage(translation.language_code, translation.language_name_zh)}</span>
              </div>
              <p className="translation-panel__text" dir={translation.language_code === 'ar' ? 'rtl' : undefined}>{translation.text}</p>
              <div className="translation-panel__source">
                <span className="translation-panel__type">{presentTranslationType(translation.translation_type, translation.authority_level, translation.review_status)}</span>
                {reviewStatus ? <span className="translation-panel__review">{reviewStatus}</span> : null}
              </div>
              {translation.note ? <p className="translation-panel__note">{translation.note}</p> : null}
            </li>
          )
        })}
      </ul>
  )
}

export default function TranslationPanel({ translations }: TranslationPanelProps) {
  if (!translations.length) return null
  const hasAlternatives = translations.some((translation) => translation.translation_type !== 'recommended')

  return (
    <section aria-labelledby="translations-title" className="term-profile-panel translation-panel" id="translations">
      <div className="term-profile-panel__heading">
        <div><p className="term-profile-panel__eyebrow">TRANSLATIONS</p><h2 id="translations-title">多语译法</h2></div>
        <p>汇集不同语种的规范译法、使用依据与校订线索，便于在具体语境中选择合适表达。</p>
      </div>
      {hasAlternatives ? <span className="translation-panel__group-label">其他译法</span> : null}
      <TranslationList translations={translations} />
    </section>
  )
}
