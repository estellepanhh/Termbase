export type AboutLanguage = 'zh' | 'en'

type WorkflowStage = { title: string; description: string }
type Capability = { title: string; description: string; linkLabel: string; to: string }
type Innovation = { title: string; description: string }

export type AboutCopy = {
  eyebrow: string
  heroTitle: string
  heroDescription: string
  heroAction: string
  originEyebrow: string
  originTitle: string
  originParagraphs: string[]
  workflowEyebrow: string
  workflowTitle: string
  workflowDescription: string
  workflowStages: WorkflowStage[]
  outcomesEyebrow: string
  outcomesTitle: string
  outcomesDescription: string
  outcomeLabels: Record<'term_count' | 'translation_count' | 'language_count' | 'published_topic_count', string>
  loading: string
  error: string
  retry: string
  capabilitiesEyebrow: string
  capabilitiesTitle: string
  capabilities: Capability[]
  innovationEyebrow: string
  innovationTitle: string
  innovations: Innovation[]
  progressEyebrow: string
  progressTitle: string
  completedTitle: string
  completedItems: string[]
  ongoingTitle: string
  ongoingItems: string[]
  projectEyebrow: string
  projectTitle: string
  projectDescription: string
}

const zh: AboutCopy = {
  eyebrow: '项目成果档案 · PROJECT DOSSIER',
  heroTitle: '中国特色话语多语术语库工程化建设与研究',
  heroDescription: '面向中国特色概念的国际传播需求，以语言研究为根基，连接术语规范、跨文化阐释、人工审校与多语知识发布。',
  heroAction: '查看建设成果',
  originEyebrow: '研究缘起',
  originTitle: '中国话语如何被准确理解',
  originParagraphs: [
    '中国特色概念往往承载历史语境、制度经验与文化价值，简单的词语替换难以完整传递其含义。',
    '本项目从外国语言文学与跨文化传播视角出发，为术语保留定义、译法、语境、来源与文化提示，让表达选择能够被讨论、核验和持续修订。',
  ],
  workflowEyebrow: '术语生产闭环',
  workflowTitle: '一条术语如何成为可信知识',
  workflowDescription: '机器提高整理和比较效率，研究者负责证据判断、语言选择与最终发布。',
  workflowStages: [
    { title: '术语采集', description: '从政策文本、文化资料和既有研究中发现候选概念。' },
    { title: '规范整理', description: '统一名称、层级、分类、定义与来源记录。' },
    { title: 'AI 辅助', description: '生成可比较的表达建议，并提示潜在文化风险。' },
    { title: '人工审校', description: '研究者结合语境、受众与证据进行判断和修订。' },
    { title: '多语发布', description: '形成可检索、可追溯、可继续完善的术语档案。' },
  ],
  outcomesEyebrow: '真实数据 · LIVE OUTCOMES',
  outcomesTitle: '当前建设成果',
  outcomesDescription: '以下数据直接来自平台数据库，随知识建设进度实时更新。',
  outcomeLabels: {
    term_count: '术语档案',
    translation_count: '多语译名',
    language_count: '覆盖语种',
    published_topic_count: '已发布专题',
  },
  loading: '正在加载成果数据',
  error: '成果数据暂时无法加载，项目介绍仍可正常阅读。',
  retry: '重新加载成果数据',
  capabilitiesEyebrow: '平台能力',
  capabilitiesTitle: '研究成果如何被使用',
  capabilities: [
    { title: '术语检索与档案', description: '检索概念、译名、文化分类和可追溯依据。', linkLabel: '进入术语检索', to: '/discover' },
    { title: '跨文化表达实验室', description: '围绕受众、文体和场景比较表达方案与风险。', linkLabel: '进入表达实验室', to: '/lab' },
    { title: '文化专题', description: '把术语、人物与文化材料组织为可阅读的研究专题。', linkLabel: '查看文化专题', to: '/topics' },
    { title: '研究工作台', description: '保存 AI 草案、人工修订和审校过程，沉淀研究案例。', linkLabel: '进入研究工作台', to: '/workspace' },
  ],
  innovationEyebrow: '项目特色',
  innovationTitle: '从词表走向可持续的研究过程',
  innovations: [
    { title: '语言研究', description: '不止记录对应词，更关注语义、文体、受众和使用场景。' },
    { title: '文化阐释', description: '将概念置于中华文化语境中，说明直译风险与理解差异。' },
    { title: '人机协同', description: 'AI 提供草案和比较材料，人工审校保留学术责任与判断。' },
    { title: '知识工程', description: '用结构化档案、来源和修订记录支持长期积累与复用。' },
  ],
  progressEyebrow: '建设进展',
  progressTitle: '明确区分已有成果与后续方向',
  completedTitle: '已形成',
  completedItems: ['多语术语检索与知识档案', '跨文化表达生成与比较', '人工评审和修订留痕', '淮河文化示范专题'],
  ongoingTitle: '持续建设',
  ongoingItems: ['扩充语种、术语与权威来源', '完善专题研究和多语内容', '加强公开部署、安全与内容治理'],
  projectEyebrow: '关于项目',
  projectTitle: '服务文化强国建设的大学生创新实践',
  projectDescription: '本平台是大学生创新训练项目的阶段性成果，立足外国语学院学科特色，探索中国特色话语术语知识的规范整理、跨文化表达与工程化积累。团队及立项信息将在核实后补充。',
}

const en: AboutCopy = {
  eyebrow: 'PROJECT DOSSIER',
  heroTitle: 'Engineering a Multilingual Terminology Base for Chinese Discourse',
  heroDescription: 'A language-led research platform connecting terminology, intercultural interpretation, human review, and multilingual knowledge publication.',
  heroAction: 'View project outcomes',
  originEyebrow: 'Research context',
  originTitle: 'Making Chinese concepts accurately understood',
  originParagraphs: [
    'Chinese concepts often carry historical contexts, institutional experience, and cultural values that cannot be conveyed through word substitution alone.',
    'The project records definitions, translations, contexts, sources, and cultural notes so that expression choices remain discussable, traceable, and revisable.',
  ],
  workflowEyebrow: 'Terminology workflow',
  workflowTitle: 'How a term becomes trustworthy knowledge',
  workflowDescription: 'Machines accelerate organization and comparison; researchers remain responsible for evidence, language choices, and publication.',
  workflowStages: [
    { title: 'Term collection', description: 'Identify candidate concepts in policy texts, cultural materials, and research.' },
    { title: 'Normalization', description: 'Organize names, levels, categories, definitions, and sources.' },
    { title: 'AI assistance', description: 'Draft comparable expressions and flag possible cultural risks.' },
    { title: 'Human review', description: 'Evaluate and revise proposals for context, audience, and evidence.' },
    { title: 'Multilingual publication', description: 'Publish searchable, traceable, and extensible term records.' },
  ],
  outcomesEyebrow: 'LIVE OUTCOMES',
  outcomesTitle: 'Current project outcomes',
  outcomesDescription: 'These figures come directly from the platform database and update with the research collection.',
  outcomeLabels: { term_count: 'Term records', translation_count: 'Translations', language_count: 'Languages', published_topic_count: 'Published topics' },
  loading: 'Loading project outcomes',
  error: 'Outcome data is temporarily unavailable. The project account remains readable.',
  retry: 'Reload outcome data',
  capabilitiesEyebrow: 'Platform capabilities',
  capabilitiesTitle: 'How the research can be used',
  capabilities: [
    { title: 'Term discovery and profiles', description: 'Find concepts, translations, classifications, and traceable evidence.', linkLabel: 'Explore terms', to: '/discover' },
    { title: 'Expression Lab', description: 'Compare expression choices and risks by audience, register, and setting.', linkLabel: 'Open Expression Lab', to: '/lab' },
    { title: 'Cultural topics', description: 'Read terms, people, and materials as focused cultural research.', linkLabel: 'View cultural topics', to: '/topics' },
    { title: 'Research Workspace', description: 'Preserve AI drafts, human revisions, and review histories as cases.', linkLabel: 'Open Research Workspace', to: '/workspace' },
  ],
  innovationEyebrow: 'Distinctive approach',
  innovationTitle: 'From a word list to a sustainable research process',
  innovations: [
    { title: 'Language research', description: 'Study meaning, register, audience, and use rather than isolated equivalents.' },
    { title: 'Cultural interpretation', description: 'Explain concepts in context and identify risks of literal translation.' },
    { title: 'Human–AI collaboration', description: 'Use AI for drafts and comparison while retaining human scholarly judgment.' },
    { title: 'Knowledge engineering', description: 'Structure records, sources, and revisions for long-term reuse.' },
  ],
  progressEyebrow: 'Progress',
  progressTitle: 'Separating delivered work from the next stage',
  completedTitle: 'Delivered',
  completedItems: ['Multilingual term discovery and profiles', 'Intercultural expression comparison', 'Human review and revision history', 'Huai River culture demonstration topic'],
  ongoingTitle: 'In progress',
  ongoingItems: ['Expand languages, terms, and authoritative sources', 'Develop topic research and multilingual content', 'Strengthen public deployment, security, and content governance'],
  projectEyebrow: 'About the project',
  projectTitle: 'A student innovation project for stronger cultural communication',
  projectDescription: 'This platform is a staged outcome of a student innovation training project. Grounded in foreign-language studies, it explores the normalization, intercultural expression, and sustainable engineering of terminology for Chinese discourse. Verified team and registration details will be added later.',
}

export function getAboutCopy(language: AboutLanguage, childMode: boolean): AboutCopy {
  const base = language === 'zh' ? zh : en
  if (!childMode) return base
  if (language === 'en') {
    return {
      ...base,
      heroDescription: 'This project helps people in different languages understand important Chinese ideas.',
      originTitle: 'Why some Chinese ideas need more explanation',
      originParagraphs: [
        'Some Chinese ideas come with their own stories and cultural background, so one dictionary word is not always enough.',
        'We save clear meanings, translations, examples, and sources so people can check and improve each explanation.',
      ],
      workflowTitle: 'How we study a term carefully',
      workflowDescription: 'AI helps us compare ideas, and people check the evidence and make the final choice.',
      workflowStages: [
        { title: 'Find', description: 'Find important ideas in articles and trusted materials.' },
        { title: 'Organize', description: 'Write down the name, meaning, group, and source clearly.' },
        { title: 'Compare', description: 'Ask AI for several ways to explain the idea.' },
        { title: 'Check', description: 'People check the sources and choose the clearest wording.' },
        { title: 'Share', description: 'Publish a record that people can search and improve.' },
      ],
      innovations: [
        { title: 'Words in context', description: 'We look at who is speaking, who is listening, and where the words are used.' },
        { title: 'Culture explained', description: 'We explain the story behind an idea instead of translating it word for word.' },
        { title: 'People and AI', description: 'AI offers ideas, while people check facts and make the final decision.' },
        { title: 'Knowledge that grows', description: 'Sources and changes are saved so the term record can keep getting better.' },
      ],
    }
  }
  return {
    ...base,
    heroDescription: '我们把重要的中国概念讲清楚、译准确，帮助使用不同语言的人更好地理解中国文化。',
    originTitle: '为什么有些中国概念不能只查字典',
    originParagraphs: [
      '有些中国概念有自己的故事和文化背景，不能只在字典里找一个词来替换。',
      '我们会把意思、译法、使用场景和资料来源一起保存，方便大家检查，也能继续把解释改得更清楚。',
    ],
    workflowTitle: '我们怎样把一个词研究清楚',
    workflowDescription: 'AI 帮我们整理和比较，研究者查证资料并作出最后判断。',
    workflowStages: [
      { title: '发现', description: '先从文章和资料里找出值得研究的重要概念。' },
      { title: '整理', description: '把名称、意思、分类和资料来源记录清楚。' },
      { title: '比较', description: '请 AI 提供几种说法，看看它们有什么不同。' },
      { title: '检查', description: '由研究者查资料、找问题，选出更合适的表达。' },
      { title: '分享', description: '把研究结果做成大家可以查找和继续完善的知识卡。' },
    ],
    innovations: [
      { title: '看清使用场景', description: '不只找对应词，还要看看在什么场合、对谁、应该怎样说。' },
      { title: '讲明文化故事', description: '不只逐字翻译，还会解释这个概念背后的文化。' },
      { title: '人和 AI 一起做', description: 'AI 提供想法，人来查证资料并作出最后决定。' },
      { title: '知识不断长大', description: '保存资料和每次修改，让术语档案越做越完整。' },
    ],
  }
}
