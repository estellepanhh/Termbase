import { useEffect, useState } from 'react'

const stages = ['正在读取术语知识依据', '正在生成跨文化表达方案', '正在校验引用与文化风险']
export default function GenerationStatus({ onCancel }: { onCancel: () => void }) {
  const [stage, setStage] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setStage((value) => Math.min(2, value + 1)), 1600); return () => window.clearInterval(timer) }, [])
  return <section aria-busy="true" aria-live="polite" className="generation-status"><span className="generation-status__pulse" /><div><b>{stages[stage]}</b><p>请稍候。结果到达前不会显示虚构进度。</p><button onClick={onCancel} type="button">取消等待</button></div></section>
}
