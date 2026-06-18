import {
  Bell,
  ChevronRight,
  CircleUserRound,
  Cuboid,
  LogOut,
  MessageCircle,
  Plus,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  WalletCards
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import AppBottomNav, { type MainTab } from '../components/AppBottomNav'
import StatusRow from '../components/StatusRow'
import { formatNaira } from '../utils/format'
import { statusLabel } from '../utils/records'
import type {
  AuthSession,
  BusinessProfile,
  DebtRecord,
  Expense,
  Product,
  RecentRecord,
  RecordKind,
  Sale,
  StockAlert,
  StockMovement
} from '../types'

export type WorkspaceView = 'sell' | 'stock' | 'debts' | 'insights' | 'notifications' | 'account'

interface WorkspaceScreenProps {
  authMessage: string
  business: BusinessProfile
  debtRecords: DebtRecord[]
  draftCount: number
  estimatedProfit: number
  expenses: Expense[]
  ownerWithdrawalTotal: number
  products: Product[]
  recentRecords: RecentRecord[]
  sales: Sale[]
  session: AuthSession
  stockAlerts: StockAlert[]
  stockMovements: StockMovement[]
  view: WorkspaceView
  onLogout: () => void
  onNavigate: (view: MainTab) => void
  onScan: () => void
  onStartRecord: (type: RecordKind) => void
}

export default function WorkspaceScreen({
  authMessage,
  business,
  debtRecords,
  draftCount,
  estimatedProfit,
  expenses,
  ownerWithdrawalTotal,
  products,
  recentRecords,
  sales,
  session,
  stockAlerts,
  stockMovements,
  view,
  onLogout,
  onNavigate,
  onScan,
  onStartRecord
}: WorkspaceScreenProps) {
  const navActive: MainTab = view === 'notifications' || view === 'account' ? 'today' : view

  return (
    <div className="app-shell">
      <main className="dashboard workspace-screen" aria-label={`${view} workspace`}>
        <WorkspaceHeader business={business} view={view} />

        {view === 'sell' && (
          <section className="workspace-stack">
            <SummaryBand icon={ShoppingCart} title={formatNaira(sales.reduce((total, sale) => total + sale.total, 0))} label={`${sales.length} saved sale records`} tone="green" />
            <div className="workspace-actions">
              <button className="primary-action" type="button" onClick={() => onStartRecord('sale')}>
                <Plus size={19} />
                New Sale
              </button>
              <button className="upload-button" type="button" onClick={onScan}>
                <ScanLine size={18} />
                Scan Receipt
              </button>
            </div>
            <RecordPanel title="Recent Sales" actionLabel="Review all">
              {sales.length ? (
                sales.slice(0, 8).map((sale) => (
                  <StatusRow
                    key={sale.id}
                    avatar="S"
                    meta={`${sale.customerName} - ${statusLabel(sale.status)}`}
                    title={sale.items[0]?.name || 'Sale record'}
                    tone={sale.balanceOwed ? 'coral' : 'green'}
                    value={formatNaira(sale.total)}
                  />
                ))
              ) : (
                <p className="empty-copy">No sale records yet.</p>
              )}
            </RecordPanel>
          </section>
        )}

        {view === 'stock' && (
          <section className="workspace-stack">
            <SummaryBand icon={Cuboid} title={`${stockAlerts.length} low stock`} label={`${products.length} products being tracked`} tone="amber" />
            <div className="workspace-actions">
              <button className="primary-action" type="button" onClick={() => onStartRecord('stock')}>
                <Plus size={19} />
                Add Stock
              </button>
              <button className="upload-button" type="button" onClick={onScan}>
                <ScanLine size={18} />
                Scan Stock
              </button>
            </div>
            <RecordPanel title="Low Stock" actionLabel="Restock">
              {stockAlerts.length ? (
                stockAlerts.map((alert) => (
                  <StatusRow
                    key={alert.id}
                    actionLabel="Reorder"
                    avatar={alert.iconLabel}
                    meta={`${alert.stock} ${alert.unit} left - reorder at ${alert.reorderPoint}`}
                    title={alert.productName}
                    tone="amber"
                    value={`${alert.stock} left`}
                  />
                ))
              ) : (
                <p className="empty-copy">Stock levels look healthy.</p>
              )}
            </RecordPanel>
            <RecordPanel title="Recent Stock Movement" actionLabel="History">
              {stockMovements.slice(0, 5).map((movement) => (
                <StatusRow
                  key={movement.id}
                  avatar="ST"
                  meta={`${movement.quantity} ${movement.unit} - ${statusLabel(movement.status)}`}
                  title={movement.productName}
                  tone="blue"
                  value={formatNaira(movement.quantity * movement.unitCost)}
                />
              ))}
            </RecordPanel>
          </section>
        )}

        {view === 'debts' && (
          <section className="workspace-stack">
            <SummaryBand
              icon={UserPlus}
              title={formatNaira(debtRecords.reduce((total, debt) => total + Math.max(debt.amount - debt.paidAmount, 0), 0))}
              label={`${debtRecords.length} customer balances to follow up`}
              tone="coral"
            />
            <div className="workspace-actions">
              <button className="primary-action" type="button" onClick={() => onStartRecord('debt')}>
                <Plus size={19} />
                Record Debt
              </button>
              <button className="upload-button" type="button">
                <MessageCircle size={18} />
                Send Reminders
              </button>
            </div>
            <RecordPanel title="Customers Owing" actionLabel="Follow up">
              {debtRecords.length ? (
                debtRecords.map((debt) => (
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
            </RecordPanel>
          </section>
        )}

        {view === 'insights' && (
          <section className="workspace-stack">
            <SummaryBand icon={TrendingUp} title={formatNaira(estimatedProfit)} label="Estimated profit from recorded sales" tone="green" />
            <section className="spending-warning workspace-warning">
              <span className="warning-icon">
                <WalletCards size={34} />
                <Plus size={16} />
              </span>
              <div>
                <h3>Spending Watch</h3>
                <strong>{ownerWithdrawalTotal > estimatedProfit ? "Withdrawals are above today's profit." : "Spending is within today's profit."}</strong>
                <p>
                  Withdrawn: {formatNaira(ownerWithdrawalTotal)} - Profit: {formatNaira(estimatedProfit)}
                </p>
              </div>
              <ChevronRight size={24} />
            </section>
            <RecordPanel title="Expenses" actionLabel="Add">
              {expenses.length ? (
                expenses.slice(0, 6).map((expense) => (
                  <StatusRow
                    key={expense.id}
                    avatar="EX"
                    meta={`${expense.category} - ${statusLabel(expense.status)}`}
                    title={expense.label}
                    tone="coral"
                    value={formatNaira(expense.amount)}
                  />
                ))
              ) : (
                <p className="empty-copy">No expenses recorded yet.</p>
              )}
            </RecordPanel>
          </section>
        )}

        {view === 'notifications' && (
          <section className="workspace-stack">
            <SummaryBand icon={Bell} title={`${draftCount} drafts`} label="Items waiting for review or attention" tone={draftCount ? 'amber' : 'green'} />
            <RecordPanel title="Activity" actionLabel="Today">
              {recentRecords.length ? (
                recentRecords.map((record) => (
                  <StatusRow key={record.id} avatar={record.avatar} meta={record.meta} title={record.title} tone={record.tone} value={record.value} />
                ))
              ) : (
                <p className="empty-copy">No notifications yet.</p>
              )}
            </RecordPanel>
          </section>
        )}

        {view === 'account' && (
          <section className="workspace-stack">
            <SummaryBand icon={CircleUserRound} title={business.name} label={`${business.businessType} - ${business.location}`} tone="green" />
            <section className="panel-card exact-card account-card">
              <div className="account-line">
                <span>Signed in</span>
                <strong>{session.user.email}</strong>
              </div>
              <div className="account-line">
                <span>Owner</span>
                <strong>{business.ownerName}</strong>
              </div>
              <div className="account-safety">
                <ShieldCheck size={18} />
                Records only. Money stays with your bank, POS, transfer, or cash drawer.
              </div>
              {authMessage && <p className="auth-message">{authMessage}</p>}
              <button className="logout-button" type="button" onClick={onLogout}>
                <LogOut size={18} />
                Log out
              </button>
            </section>
          </section>
        )}

        <AppBottomNav active={navActive} onNavigate={onNavigate} />
      </main>
    </div>
  )
}

function WorkspaceHeader({ business, view }: { business: BusinessProfile; view: WorkspaceView }) {
  const titles: Record<WorkspaceView, string> = {
    sell: 'Sell',
    stock: 'Stock',
    debts: 'Debts',
    insights: 'Insights',
    notifications: 'Notifications',
    account: 'Account'
  }

  return (
    <header className="workspace-header">
      <div>
        <span>{business.name}</span>
        <h1>{titles[view]}</h1>
      </div>
    </header>
  )
}

function SummaryBand({
  icon: Icon,
  label,
  title,
  tone
}: {
  icon: LucideIcon
  label: string
  title: string
  tone: 'green' | 'amber' | 'coral'
}) {
  return (
    <section className={`summary-band tone-${tone}`}>
      <span>
        <Icon size={26} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{label}</p>
      </div>
    </section>
  )
}

function RecordPanel({ actionLabel, children, title }: { actionLabel: string; children: ReactNode; title: string }) {
  return (
    <section className="panel-card exact-card workspace-panel">
      <div className="panel-topline">
        <h3>{title}</h3>
        <button type="button">{actionLabel}</button>
      </div>
      {children}
    </section>
  )
}
