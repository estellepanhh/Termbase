const stages = [
  ['01', '术语采集', '汇入政策文本、典籍材料、区域文化资料与项目组整理成果。'],
  ['02', '规范整理', '统一术语名称、层级、分类、定义与来源依据。'],
  ['03', 'AI 辅助表达', '生成译法建议、儿童化解释和跨文化传播表达草案。'],
  ['04', '人工审校', '由项目成员和指导教师复核概念、译法和文化风险。'],
  ['05', '多语发布', '面向检索、专题、表达实验室发布可追溯术语知识。'],
  ['06', '反馈修订', '根据使用场景和审校意见持续更新术语档案。'],
] as const

export default function ResearchFlow() {
  return (
    <ol aria-label="术语生产闭环" className="research-flow">
      {stages.map(([no, title, text]) => (
        <li key={title}>
          <span>{no}</span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
