import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Cuboid,
  Menu,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserPlus,
  UsersRound,
  WalletCards
} from 'lucide-react'
import ActionButton from '../components/ActionButton'
import AppBottomNav, { type MainTab } from '../components/AppBottomNav'
import MetricCard from '../components/MetricCard'
import { quickRecordExample } from '../data/mockData'
import { formatNaira } from '../utils/format'
import type { BusinessProfile, DashboardMetric, DebtRecord, MetricTone, RecordKind, StockAlert } from '../types'

interface DashboardScreenProps {
  business: BusinessProfile
  metrics: DashboardMetric[]
  debtRecords: DebtRecord[]
  stockAlerts: StockAlert[]
  ownerWithdrawalTotal: number
  estimatedProfit: number
  draftCount: number
  onAccount: () => void
  onNavigate: (view: MainTab) => void
  onNotifications: () => void
  onStartRecord: (type: RecordKind) => void
  onScan: () => void
}

const actions = [
  { label: 'New Sale', type: 'sale', tone: 'green', icon: ShoppingCart },
  { label: 'Expense', type: 'expense', tone: 'amber', icon: WalletCards },
  { label: 'Add Stock', type: 'stock', tone: 'blue', icon: Cuboid },
  { label: 'Debt', type: 'debt', tone: 'coral', icon: UserPlus }
] as const

export default function DashboardScreen({
  business,
  metrics,
  debtRecords,
  stockAlerts,
  ownerWithdrawalTotal,
  estimatedProfit,
  draftCount,
  onAccount,
  onNavigate,
  onNotifications,
  onStartRecord,
  onScan
}: DashboardScreenProps) {
  const debtBalance = debtRecords.reduce((total, debt) => total + Math.max(debt.amount - debt.paidAmount, 0), 0)
  const spendingIsHigh = ownerWithdrawalTotal > estimatedProfit
  const displayDate = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date())

  return (
    <div className="app-shell">
      <main className="dashboard exact-dashboard today-dashboard" aria-label="MarketOS Today dashboard">
        <div className="today-content">
          <header className="mock-header">
            <div>
              <h1>MarketOS</h1>
              <button className="business-switcher" type="button" onClick={onAccount}>
                {business.name}
                <ChevronDown size={20} />
              </button>
              <span className="date-line">
                <CalendarDays size={17} />
                Today, {displayDate}
              </span>
            </div>
            <div className="header-actions">
              <button className="round-icon-button notification-button" type="button" aria-label="Notifications" onClick={onNotifications}>
                <Bell size={22} />
                {draftCount > 0 && <span>{draftCount}</span>}
              </button>
              <button className="round-icon-button" type="button" aria-label="Account menu" onClick={onAccount}>
                <Menu size={24} />
              </button>
            </div>
          </header>

          <div className="records-pill exact-pill">
            <ShieldCheck size={18} />
            {business.operatingNote}
          </div>

          <section className="pulse-section">
            <h2>Today&apos;s Business Pulse</h2>
            <div className="exact-metrics-grid">
              {metrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>
          </section>

          <section className="quick-record-card">
            <div className="quick-title">
              <Sparkles size={23} />
              <strong>Quick Record</strong>
            </div>
            <div className="quick-record-row">
              <button className="record-input exact-record-input" type="button" onClick={onScan}>
                {quickRecordExample}
                <ScanLine size={21} />
              </button>
              <button className="review-button" type="button" onClick={() => onStartRecord('sale')}>
                Review
                <ChevronRight size={21} />
              </button>
            </div>
            <p>Type naturally, then review before saving.</p>
          </section>

          <section className="exact-actions" aria-label="Quick actions">
            {actions.map((action) => (
              <ActionButton
                key={action.label}
                icon={action.icon}
                label={action.label}
                tone={action.tone as MetricTone}
                onClick={() => onStartRecord(action.type)}
              />
            ))}
          </section>

          <section className="today-alert-strip" aria-label="Business alerts">
            <button className="today-alert-card tone-coral" type="button" onClick={() => onNavigate('debts')}>
              <UsersRound size={20} />
              <span>
                <strong>{formatNaira(debtBalance)}</strong>
                Customer debts
              </span>
              <ChevronRight size={17} />
            </button>
            <button className="today-alert-card tone-amber" type="button" onClick={() => onNavigate('stock')}>
              <Cuboid size={20} />
              <span>
                <strong>{stockAlerts.length} low</strong>
                Stock alerts
              </span>
              <ChevronRight size={17} />
            </button>
            <button className={spendingIsHigh ? 'today-alert-card tone-coral' : 'today-alert-card tone-green'} type="button" onClick={() => onNavigate('insights')}>
              <WalletCards size={20} />
              <span>
                <strong>{spendingIsHigh ? 'Watch spend' : 'Spend okay'}</strong>
                Profit check
              </span>
              <ChevronRight size={17} />
            </button>
          </section>
        </div>

        <AppBottomNav active="today" onNavigate={onNavigate} />
      </main>
    </div>
  )
}
