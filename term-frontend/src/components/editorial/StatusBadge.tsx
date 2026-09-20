import type { ReactNode } from 'react'
import './editorial.css'
export default function StatusBadge({tone='neutral',children}: {tone?:'neutral'|'info'|'success'|'warning'|'danger';children:ReactNode}) { return <span className={`status-badge status-badge--${tone}`}>{children}</span> }
