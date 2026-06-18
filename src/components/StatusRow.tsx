import { ChevronRight } from 'lucide-react'
import type { MetricTone } from '../types'

interface StatusRowProps {
  title: string
  meta: string
  value: string
  tone: MetricTone
  avatar?: string
  actionLabel?: string
}

export default function StatusRow({ title, meta, value, tone, avatar, actionLabel }: StatusRowProps) {
  return (
    <div className="status-row">
      {avatar && <span className={`row-avatar tone-${tone}`}>{avatar}</span>}
      <div className="row-main">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <div className="row-end">
        <b className={`row-value tone-${tone}`}>{actionLabel ?? value}</b>
        <ChevronRight size={17} />
      </div>
    </div>
  )
}
