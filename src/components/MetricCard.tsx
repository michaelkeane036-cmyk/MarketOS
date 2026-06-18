import { Box, ChartNoAxesColumnIncreasing, PieChart, TrendingUp, UsersRound } from 'lucide-react'
import type { DashboardMetric } from '../types'

interface MetricCardProps {
  metric: DashboardMetric
}

const metricIcons = {
  sales: TrendingUp,
  profit: PieChart,
  debts: UsersRound,
  stock: Box
}

export default function MetricCard({ metric }: MetricCardProps) {
  const Icon = metricIcons[metric.id as keyof typeof metricIcons] ?? ChartNoAxesColumnIncreasing

  return (
    <article className={`metric-card tone-${metric.tone}`}>
      <span className="metric-icon">
        <Icon size={21} strokeWidth={2.4} />
      </span>
      <span className="metric-label">{metric.label}</span>
      <strong>{metric.value}</strong>
      <span className="metric-detail">{metric.detail}</span>
      <b>{metric.trend}</b>
    </article>
  )
}
