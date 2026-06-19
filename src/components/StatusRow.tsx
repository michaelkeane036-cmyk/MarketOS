import { ChevronRight } from 'lucide-react'
import type { MetricTone } from '../types'

interface StatusRowProps {
  title: string
  meta: string
  value: string
  tone: MetricTone
  avatar?: string
  actionLabel?: string
  onClick?: () => void
}

export default function StatusRow({ title, meta, value, tone, avatar, actionLabel, onClick }: StatusRowProps) {
  const content = (
    <>
      {avatar && <span className={`row-avatar tone-${tone}`}>{avatar}</span>}
      <div className="row-main">
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
      <div className="row-end">
        <b className={`row-value tone-${tone}`}>{actionLabel ?? value}</b>
        <ChevronRight size={17} />
      </div>
    </>
  )

  if (onClick) {
    return (
      <button className="status-row status-row-button" type="button" onClick={onClick}>
        {content}
      </button>
    )
  }

  return (
    <div className="status-row">
      {content}
    </div>
  )
}
