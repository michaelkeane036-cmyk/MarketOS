import {
  Bell,
  Box,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Cuboid,
  Home,
  Menu,
  MessageCircle,
  Plus,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserPlus,
  UsersRound,
  WalletCards
} from 'lucide-react'
import ActionButton from '../components/ActionButton'
import MetricCard from '../components/MetricCard'
import StatusRow from '../components/StatusRow'
import { quickRecordExample } from '../data/mockData'
import { formatNaira } from '../utils/format'
import { statusLabel } from '../utils/records'
import type {
  AuthSession,
  BusinessProfile,
  DashboardMetric,
  DebtRecord,
  MetricTone,
  RecentRecord,
  RecordKind,
  StockAlert
} from '../types'

interface DashboardScreenProps {
  authMessage: string
  business: BusinessProfile
  metrics: DashboardMetric[]
  debtRecords: DebtRecord[]
  stockAlerts: StockAlert[]
  recentRecords: RecentRecord[]
  ownerWithdrawalTotal: number
  estimatedProfit: number
  draftCount: number
  session: AuthSession
  onLogout: () => void
  onStartRecord: (type: RecordKind) => void
  onScan: () => void
}

const actions = [
  { label: 'New Sale', type: 'sale', tone: 'green', icon: ShoppingCart },
  { label: 'Expense', type: 'expense', tone: 'amber', icon: WalletCards },
  { label: 'Add Stock', type: 'stock', tone: 'blue', icon: Cuboid },
  { label: 'Debt', type: 'debt', tone: 'coral', icon: UserPlus }
] as const

const navItems = [
  { label: 'Today', icon: Home },
  { label: 'Sell', icon: ShoppingCart, type: 'sale' },
  { label: 'Stock', icon: Cuboid, type: 'stock' },
  { label: 'Debts', icon: UsersRound, type: 'debt' },
  { label: 'Insights', icon: Box }
] as const

export default function DashboardScreen({
  authMessage,
  business,
  metrics,
  debtRecords,
  stockAlerts,
  recentRecords,
  ownerWithdrawalTotal,
  estimatedProfit,
  draftCount,
  session,
  onLogout,
  onStartRecord,
  onScan
}: DashboardScreenProps) {
  const spendingIsHigh = ownerWithdrawalTotal > estimatedProfit
  const displayDate = new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date())

  return (
    <div className="app-shell">
      <main className="dashboard exact-dashboard" aria-label="MarketOS dashboard">
        <header className="mock-header">
          <div>
            <h1>MarketOS</h1>
            <button className="business-switcher" type="button">
              {business.name}
              <ChevronDown size={20} />
            </button>
            <span className="date-line">
              <CalendarDays size={17} />
              Today, {displayDate}
            </span>
          </div>
          <div className="header-actions">
            <button className="round-icon-button notification-button" type="button" aria-label="Notifications">
              <Bell size={22} />
              {draftCount > 0 && <span>{draftCount}</span>}
            </button>
            <button className="round-icon-button" type="button" aria-label="Menu" onClick={onLogout}>
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
            <Sparkles size={24} />
            <strong>Quick Record</strong>
          </div>
          <div className="quick-record-row">
            <button className="record-input exact-record-input" type="button" onClick={onScan}>
              {quickRecordExample}
              <ScanLine size={22} />
            </button>
            <button className="review-button" type="button" onClick={() => onStartRecord('sale')}>
              Review Entry
              <ChevronRight size={22} />
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

        <section className="business-panels">
          <article className="panel-card exact-card">
            <div className="panel-topline">
              <h3>Customers Owing</h3>
              <button type="button">See all</button>
            </div>
            {debtRecords.length ? (
              debtRecords.slice(0, 2).map((debt) => (
                <StatusRow
                  key={debt.id}
                  avatar={debt.initials}
                  meta={`${debt.sinceLabel} - ${statusLabel(debt.status)}`}
                  title={debt.customerName}
                  tone="coral"
                  value={formatNaira(Math.max(debt.amount - debt.paidAmount, 0))}
                />
              ))
            ) : (
              <p className="empty-copy">No unpaid customer balance.</p>
            )}
            <button className="outline-action green-outline" type="button">
              <MessageCircle size={20} />
              Send Reminders
              <ChevronRight size={18} />
            </button>
          </article>

          <article className="panel-card exact-card">
            <div className="panel-topline amber-link">
              <h3>Low Stock</h3>
              <button type="button">See all</button>
            </div>
            {stockAlerts.length ? (
              stockAlerts.slice(0, 2).map((alert) => (
                <StatusRow
                  key={alert.id}
                  actionLabel="Reorder"
                  avatar={alert.iconLabel}
                  meta={`${alert.stock} ${alert.unit} left`}
                  title={alert.productName}
                  tone="amber"
                  value={`${alert.stock} left`}
                />
              ))
            ) : (
              <p className="empty-copy">Stock levels look healthy.</p>
            )}
            <button className="outline-action amber-outline" type="button">
              <ShoppingCart size={20} />
              View All Products
              <ChevronRight size={18} />
            </button>
          </article>
        </section>

        <section className="spending-warning">
          <span className="warning-icon">
            <WalletCards size={34} />
            <Plus size={16} />
          </span>
          <div>
            <h3>Spending Watch</h3>
            <strong>{spendingIsHigh ? "Withdrawals are above today's profit." : "Spending is within today's profit."}</strong>
            <p>
              Withdrawn: {formatNaira(ownerWithdrawalTotal)} - Profit: {formatNaira(estimatedProfit)}
            </p>
          </div>
          <ChevronRight size={24} />
        </section>

        <section className="panel-card exact-card recent-sales-card">
          <div className="panel-topline green-link">
            <h3>Recent Records</h3>
            <button type="button">See all</button>
          </div>
          {recentRecords.map((record) => (
            <StatusRow
              key={record.id}
              avatar={record.avatar}
              meta={record.meta}
              title={record.title}
              tone={record.tone}
              value={record.value}
            />
          ))}
        </section>

        {!business.setupComplete && (
          <section className="setup-card below-fold-card">
            <CircleUserRound size={18} />
            <span>
              Signed in as {session.user.email}. Finish setup to personalize categories, staff and opening stock.
              {authMessage ? ` ${authMessage}` : ''}
            </span>
          </section>
        )}

        <nav className="bottom-nav exact-bottom-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={item.label === 'Today' ? 'active' : ''}
                key={item.label}
                type="button"
                onClick={() => {
                  if ('type' in item) onStartRecord(item.type)
                }}
              >
                <Icon size={24} strokeWidth={2.2} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </main>
    </div>
  )
}
