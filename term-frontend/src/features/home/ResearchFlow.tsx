import { Link } from 'react-router-dom'
const steps=[['01','术语知识','建立概念、译法与来源之间的可靠联系','/discover'],['02','来源证据','回到典籍、政策与研究材料核验表达','/discover'],['03','跨文化表达','面向具体受众和场景比较表达策略','/lab'],['04','人工评审','沉淀可追溯的修订与研究案例','/workspace']]
export default function ResearchFlow(){return <ol aria-label="术语生产与评审流程" className="research-flow">{steps.map(([no,title,text,to])=><li key={no}><span>{no}</span><div><h3>{title}</h3><p>{text}</p><Link to={to}>进入研究环节 →</Link></div></li>)}</ol>}
