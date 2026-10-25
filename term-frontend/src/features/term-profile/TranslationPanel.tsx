import type { TranslationDetail } from '../../types/knowledge'
import { presentLanguage, presentReviewStatus, presentTranslationType } from './translationPresentation'

type TranslationPanelProps = {
  translations: TranslationDetail[]
}

function TranslationList({ translations, label }: { translations: TranslationDetail[]; label: string }) {
  if (!translations.length) return null

  return (
    <div className="translation-panel__group">
      <h3>{label}</h3>
      <ul className="translation-panel__list">
        {translations.map((translation) => {
          const reviewStatus = presentReviewStatus(translation.review_status)
          return (
            <li className="translation-panel__item" key={`${translation.language_code}-${translation.text}`}>
              <div className="translation-panel__language-line">
                <span className="translation-panel__language">{presentLanguage(translation.language_code, translation.language_name_zh)}</span>
                <span className="translation-panel__type">{presentTranslationType(translation.translation_type, translation.authority_level, translation.review_status)}</span>
                {reviewStatus ? <span className="translation-panel__review">{reviewStatus}</span> : null}
              </div>
              <p className="translation-panel__text">{translation.text}</p>
              {translation.note ? <p className="translation-panel__note">{translation.note}</p> : null}
            </li>
          )
        })}
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
