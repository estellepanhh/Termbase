import type { Audience, EnglishLocale, ExpressionStyle, Scenario } from '../../types/expressionLab'

export interface FormValues { sourceText: string; audience: Audience; scenario: Scenario; style: ExpressionStyle; locale: EnglishLocale }
interface Props { values: FormValues; errors: { terms?: string; sourceText?: string }; loading: boolean; onChange: (value: FormValues) => void; onSubmit: () => void }

const option = (value: string, label: string) => <option key={value} value={value}>{label}</option>

export default function CommunicationTaskForm({ values, errors, loading, onChange, onSubmit }: Props) {
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => onChange({ ...values, [key]: value })
  return <section aria-labelledby="task-form-title" className="lab-panel"><div className="lab-section-heading"><span>02</span><div><p>COMMUNICATION BRIEF</p><h2 id="task-form-title">定义传播任务</h2></div></div>
    <div className="lab-form-grid">
      <label>目标受众<select onChange={(e) => set('audience', e.target.value as Audience)} value={values.audience}>{[['overseas_youth','海外青年'],['international_media','国际媒体'],['academic','学术受众'],['general_public','普通公众']].map(([v,l]) => option(v,l))}</select></label>
      <label>传播场景<select onChange={(e) => set('scenario', e.target.value as Scenario)} value={values.scenario}>{[['cultural_exhibition','文化展陈'],['news_media','新闻传播'],['academic_paper','学术论文'],['policy_text','政策文本'],['social_media','社交媒体']].map(([v,l]) => option(v,l))}</select></label>
      <label>表达风格<select onChange={(e) => set('style', e.target.value as ExpressionStyle)} value={values.style}>{[['explanatory','解释性'],['formal','正式'],['concise','简洁'],['accessible','通俗']].map(([v,l]) => option(v,l))}</select></label>
      <label>英语区域<select onChange={(e) => set('locale', e.target.value as EnglishLocale)} value={values.locale}>{[['general_english','通用英语'],['british_english','英式英语'],['american_english','美式英语']].map(([v,l]) => option(v,l))}</select></label>
    </div>
    <label className="lab-source-field" htmlFor="lab-source-text">中文待表达文本<textarea aria-label="中文待表达文本" aria-invalid={Boolean(errors.sourceText)} id="lab-source-text" maxLength={1000} onChange={(e) => set('sourceText', e.target.value)} rows={7} value={values.sourceText} /><span>{values.sourceText.length}/1000</span></label>
    {errors.terms ? <p className="field-error">{errors.terms}</p> : null}{errors.sourceText ? <p className="field-error">{errors.sourceText}</p> : null}
    <button className="lab-primary-action" disabled={loading} onClick={onSubmit} type="button">{loading ? '正在生成研究报告…' : '生成跨文化表达报告'}</button>
  </section>
}
