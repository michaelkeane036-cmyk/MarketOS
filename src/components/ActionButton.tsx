import type { LucideIcon } from 'lucide-react'
import type { MetricTone } from '../types'

interface ActionButtonProps {
  label: string
  tone: MetricTone
  icon: LucideIcon
  onClick?: () => void
}

export default function ActionButton({ label, tone, icon: Icon, onClick }: ActionButtonProps) {
  return (
    <button className={`action-tile tone-${tone}`} type="button" onClick={onClick}>
      <Icon size={35} strokeWidth={2.2} />
      <strong>{label}</strong>
    </button>
  )
}
