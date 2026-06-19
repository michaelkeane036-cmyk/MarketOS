import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  CircleUserRound,
  Cuboid,
  Edit3,
  LogOut,
  MessageCircle,
  Plus,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  WalletCards,
  X
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { FormEvent, ReactNode, useMemo, useState } from 'react'
import AppBottomNav, { type MainTab } from '../components/AppBottomNav'
import InstallPrompt from '../components/InstallPrompt'
import StatusRow from '../components/StatusRow'
import { formatNaira } from '../utils/format'
import { buildCustomerLedger, buildDailyCloseout, buildWhatsAppCloseoutText } from '../utils/businessInsights'
import { statusLabel } from '../utils/records'
import { issueMessages, validateCustomerDraft, validateProductDraft } from '../utils/validation'
import type {
  AuthSession,
  BusinessProfile,
  Customer,
  CustomerDraft,
  DebtRecord,
  Expense,
  MarketRecords,
  PersistedScanDraft,
  Product,
  ProductDraft,
  RecentRecord,
  RecordKind,
  ReviewEntryDraft,
  Sale,
  StockAlert,
  StockMovement
} from '../types'

export type WorkspaceView = 'sell' | 'stock' | 'debts' | 'insights' | 'notifications' | 'account'

interface WorkspaceScreenProps {
  authMessage: string
  business: BusinessProfile
  customers: Customer[]
  debtRecords: DebtRecord[]
  draftCount: number
  estimatedProfit: number
  expenses: Expense[]
  ownerWithdrawalTotal: number
  products: Product[]
  recentRecords: RecentRecord[]
  sales: Sale[]
  scanDrafts: PersistedScanDraft[]
  session: AuthSession
  stockAlerts: StockAlert[]
  stockMovements: StockMovement[]
  records: MarketRecords
  view: WorkspaceView
  onCorrectRecord: (type: RecordKind, draft: ReviewEntryDraft) => void
  onLogout: () => void
  onNavigate: (view: MainTab) => void
  onReviewDraft: (draftId: string) => void
  onSaveCustomer: (draft: CustomerDraft) => void
  onSaveProduct: (draft: ProductDraft) => void
  onScan: () => void
  onStartCustomerRecord: (type: Extract<RecordKind, 'sale' | 'debt'>, customerName: string, customerId?: string) => void
  onStartRecord: (type: RecordKind) => void
  onVoidRecord: (type: RecordKind, id: string, reason: string) => void
}

interface RecordDetail {
  id: string
  type: RecordKind
  title: string
  meta: string
  amount: string
  status: string
  evidenceCount: number
  isVoid: boolean
  voidReason?: string
  correctionDraft: ReviewEntryDraft
}

export default function WorkspaceScreen({
  authMessage,
  business,
  customers,
  debtRecords,
  draftCount,
  estimatedProfit,
  expenses,
  ownerWithdrawalTotal,
  products,
  recentRecords,
  records,
  sales,
  scanDrafts,
  session,
  stockAlerts,
  stockMovements,
  view,
  onCorrectRecord,
  onLogout,
  onNavigate,
  onReviewDraft,
  onSaveCustomer,
  onSaveProduct,
  onScan,
  onStartCustomerRecord,
  onStartRecord,
  onVoidRecord
}: WorkspaceScreenProps) {
  const [selectedRecord, setSelectedRecord] = useState<RecordDetail | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [shareMessage, setShareMessage] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const navActive: MainTab = view === 'notifications' || view === 'account' ? 'today' : view
  const activeScanDrafts = scanDrafts.filter((draft) => draft.status === 'draft')
  const closeout = useMemo(() => buildDailyCloseout(records, business), [business, records])
  const selectedCustomer = selectedCustomerId ? customers.find((customer) => customer.id === selectedCustomerId) : undefined
  const selectedLedger = selectedCustomer ? buildCustomerLedger(selectedCustomer, records) : null

  const handleVoid = () => {
    if (!selectedRecord) return
    onVoidRecord(selectedRecord.type, selectedRecord.id, voidReason || 'Voided by owner')
    setSelectedRecord(null)
    setVoidReason('')
  }

  const handleCorrect = () => {
    if (!selectedRecord) return
    onCorrectRecord(selectedRecord.type, selectedRecord.correctionDraft)
  }

  const handleShareCloseout = async () => {
    const text = buildWhatsAppCloseoutText(closeout)
    try {
      if (navigator.share) {
        await navigator.share({ text, title: `${business.name} Daily Summary` })
        setShareMessage('Summary shared.')
        return
      }
      await handleCopyText(text, 'Summary copied for WhatsApp.')
    } catch {
      setShareMessage('Could not share automatically. Copy is available in the summary card.')
    }
  }

  const handleCopyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setShareMessage(successMessage)
    } catch {
      setShareMessage('Could not copy automatically. Select the text manually and copy it.')
    }
  }

  const handleSendDebtReminders = async () => {
    const activeDebts = debtRecords.filter((debt) => !debt.isVoid && Math.max(debt.amount - debt.paidAmount, 0) > 0)
    if (!activeDebts.length) {
      setShareMessage('No active customer debts to remind.')
      return
    }

    const debtLines = activeDebts
      .map((debt) => `${debt.customerName}: ${formatNaira(Math.max(debt.amount - debt.paidAmount, 0))} outstanding`)
      .join('\n')
    const reminderText = `${business.name} debt reminders\n${debtLines}\n\nRecords only. Money stays with your bank/POS/cash drawer.`

    try {
      if (navigator.share) {
        await navigator.share({ text: reminderText, title: `${business.name} Debt Reminders` })
        setShareMessage('Debt reminder summary shared.')
        return
      }
      await handleCopyText(reminderText, 'Debt reminder summary copied.')
    } catch {
      setShareMessage('Could not share reminders. Try copying from a customer ledger instead.')
    }
  }

  return (
    <div className="app-shell">
      <main className="dashboard workspace-screen" aria-label={`${view} workspace`}>
        <WorkspaceHeader business={business} view={view} />

        {view === 'sell' && (
          <section className="workspace-stack">
            <SummaryBand icon={ShoppingCart} title={formatNaira(activeSales(sales).reduce((total, sale) => total + sale.total, 0))} label={`${activeSales(sales).length} active sale records`} tone="green" />
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
            <CustomerManager customers={customers} onSaveCustomer={onSaveCustomer} onSelectCustomer={setSelectedCustomerId} compact />
            {selectedLedger && (
              <CustomerLedgerPanel
                ledger={selectedLedger}
                onClose={() => setSelectedCustomerId(null)}
                onCopyReminder={(message) => {
                  void handleCopyText(message, 'Reminder copied.')
                }}
                onRecordDebt={() => onStartCustomerRecord('debt', selectedLedger.customer.name, selectedLedger.customer.id)}
                onRecordSale={() => onStartCustomerRecord('sale', selectedLedger.customer.name, selectedLedger.customer.id)}
              />
            )}
            <RecordPanel title="Recent Sales" actionLabel="Review">
              {sales.length ? (
                sales.slice(0, 10).map((sale) => (
                  <StatusRow
                    key={sale.id}
                    avatar="S"
                    meta={`${sale.customerName} - ${sale.isVoid ? 'Voided' : statusLabel(sale.status)}`}
                    title={sale.items[0]?.name || 'Sale record'}
                    tone={sale.isVoid || sale.balanceOwed ? 'coral' : 'green'}
                    value={formatNaira(sale.total)}
                    onClick={() => setSelectedRecord(detailFromSale(sale))}
                  />
                ))
              ) : (
                <p className="empty-copy">No sale records yet.</p>
              )}
            </RecordPanel>
            {selectedRecord && <RecordDetailPanel detail={selectedRecord} voidReason={voidReason} onChangeVoidReason={setVoidReason} onClose={() => setSelectedRecord(null)} onCorrect={handleCorrect} onVoid={handleVoid} />}
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
            <ProductManager products={products} onSaveProduct={onSaveProduct} />
            <RecordPanel title="Recent Stock Movement" actionLabel="History">
              {stockMovements.length ? (
                stockMovements.slice(0, 8).map((movement) => (
                  <StatusRow
                    key={movement.id}
                    avatar="ST"
                    meta={`${movement.quantity} ${movement.unit} - ${movement.isVoid ? 'Voided' : statusLabel(movement.status)}`}
                    title={movement.productName}
                    tone={movement.isVoid ? 'coral' : 'blue'}
                    value={formatNaira(movement.quantity * movement.unitCost)}
                    onClick={() => setSelectedRecord(detailFromStock(movement))}
                  />
                ))
              ) : (
                <p className="empty-copy">No stock movements yet.</p>
              )}
            </RecordPanel>
            {selectedRecord && <RecordDetailPanel detail={selectedRecord} voidReason={voidReason} onChangeVoidReason={setVoidReason} onClose={() => setSelectedRecord(null)} onCorrect={handleCorrect} onVoid={handleVoid} />}
          </section>
        )}

        {view === 'debts' && (
          <section className="workspace-stack">
            <SummaryBand
              icon={UserPlus}
              title={formatNaira(debtRecords.reduce((total, debt) => total + Math.max(debt.amount - debt.paidAmount, 0), 0))}
              label={`${debtRecords.length} active customer balances`}
              tone="coral"
            />
            <div className="workspace-actions">
              <button className="primary-action" type="button" onClick={() => onStartRecord('debt')}>
                <Plus size={19} />
                Record Debt
              </button>
              <button className="upload-button" type="button" onClick={() => void handleSendDebtReminders()}>
                <MessageCircle size={18} />
                Send Reminders
              </button>
            </div>
            <CustomerManager customers={customers} onSaveCustomer={onSaveCustomer} onSelectCustomer={setSelectedCustomerId} />
            {selectedLedger && (
              <CustomerLedgerPanel
                ledger={selectedLedger}
                onClose={() => setSelectedCustomerId(null)}
                onCopyReminder={(message) => {
                  void handleCopyText(message, 'Reminder copied.')
                }}
                onRecordDebt={() => onStartCustomerRecord('debt', selectedLedger.customer.name, selectedLedger.customer.id)}
                onRecordSale={() => onStartCustomerRecord('sale', selectedLedger.customer.name, selectedLedger.customer.id)}
              />
            )}
            <RecordPanel title="Customers Owing" actionLabel="Follow up">
              {debtRecords.length ? (
                debtRecords.map((debt) => (
                  <StatusRow
                    key={debt.id}
                    avatar={debt.initials}
                    meta={`${debt.sinceLabel} - ${debt.isVoid ? 'Voided' : statusLabel(debt.status)}`}
                    title={debt.customerName}
                    tone="coral"
                    value={formatNaira(Math.max(debt.amount - debt.paidAmount, 0))}
                    onClick={() => setSelectedRecord(detailFromDebt(debt))}
                  />
                ))
              ) : (
                <p className="empty-copy">No unpaid customer balance.</p>
              )}
            </RecordPanel>
            {selectedRecord && <RecordDetailPanel detail={selectedRecord} voidReason={voidReason} onChangeVoidReason={setVoidReason} onClose={() => setSelectedRecord(null)} onCorrect={handleCorrect} onVoid={handleVoid} />}
          </section>
        )}

        {view === 'insights' && (
          <section className="workspace-stack">
            <SummaryBand icon={TrendingUp} title={formatNaira(estimatedProfit)} label="Estimated profit from active records" tone="green" />
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
            <DailyCloseoutPanel closeout={closeout} shareMessage={shareMessage} onShare={handleShareCloseout} />
            <RecordPanel title="Expenses" actionLabel="Add">
              {expenses.length ? (
                expenses.slice(0, 8).map((expense) => (
                  <StatusRow
                    key={expense.id}
                    avatar="EX"
                    meta={`${expense.category} - ${expense.isVoid ? 'Voided' : statusLabel(expense.status)}`}
                    title={expense.label}
                    tone="coral"
                    value={formatNaira(expense.amount)}
                    onClick={() => setSelectedRecord(detailFromExpense(expense))}
                  />
                ))
              ) : (
                <p className="empty-copy">No expenses recorded yet.</p>
              )}
            </RecordPanel>
            {selectedRecord && <RecordDetailPanel detail={selectedRecord} voidReason={voidReason} onChangeVoidReason={setVoidReason} onClose={() => setSelectedRecord(null)} onCorrect={handleCorrect} onVoid={handleVoid} />}
          </section>
        )}

        {view === 'notifications' && (
          <section className="workspace-stack">
            <SummaryBand icon={Bell} title={`${draftCount} drafts`} label="Scans waiting for owner review" tone={draftCount ? 'amber' : 'green'} />
            <RecordPanel title="Draft Queue" actionLabel="Review">
              {activeScanDrafts.length ? (
                activeScanDrafts.map((draft) => (
                  <StatusRow
                    key={draft.id}
                    avatar="DR"
                    meta={`${statusLabel(draft.status)} - ${new Date(draft.createdAt).toLocaleDateString('en-NG')}`}
                    title={draft.extractedSummary || 'Scan draft waiting for review'}
                    tone="amber"
                    value="Review"
                    onClick={() => onReviewDraft(draft.id)}
                  />
                ))
              ) : (
                <p className="empty-copy">No draft scans waiting for review.</p>
              )}
            </RecordPanel>
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
            <InstallPrompt />
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
        <span className="panel-action-label">{actionLabel}</span>
      </div>
      {children}
    </section>
  )
}

function ProductManager({ products, onSaveProduct }: { products: Product[]; onSaveProduct: (draft: ProductDraft) => void }) {
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft())
  const [errors, setErrors] = useState<string[]>([])
  const filteredProducts = useMemo(
    () => products.filter((product) => product.name.toLowerCase().includes(search.toLowerCase())).slice(0, 6),
    [products, search]
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateProductDraft(draft)
    if (!validation.valid) {
      setErrors(issueMessages(validation))
      return
    }
    setErrors([])
    onSaveProduct(draft)
    setDraft(emptyProductDraft())
  }

  return (
    <section className="panel-card exact-card management-card">
      <div className="panel-topline">
        <h3>Products</h3>
        <button type="button" onClick={() => setDraft(emptyProductDraft())}>
          New
        </button>
      </div>
      {errors.length > 0 && (
        <div className="form-errors compact-errors" role="alert">
          {errors.map((error) => (
            <span key={error}>{error}</span>
          ))}
        </div>
      )}
      <input className="management-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" />
      <div className="mini-list">
        {filteredProducts.map((product) => (
          <button key={product.id} type="button" onClick={() => setDraft(productToDraft(product))}>
            <span>{product.name}</span>
            <b>{product.stock} {product.unit}</b>
          </button>
        ))}
      </div>
      <form className="management-form" onSubmit={handleSubmit}>
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Product name" />
        <div className="management-grid">
          <input value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} placeholder="Stock" inputMode="decimal" />
          <input value={draft.reorderPoint} onChange={(event) => setDraft({ ...draft, reorderPoint: event.target.value })} placeholder="Reorder" inputMode="decimal" />
        </div>
        <div className="management-grid">
          <input value={draft.unitCost} onChange={(event) => setDraft({ ...draft, unitCost: event.target.value })} placeholder="Cost" inputMode="decimal" />
          <input value={draft.sellingPrice} onChange={(event) => setDraft({ ...draft, sellingPrice: event.target.value })} placeholder="Selling" inputMode="decimal" />
        </div>
        <div className="management-grid">
          <input value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="Unit" />
          <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Category" />
        </div>
        <button className="mini-save-button" type="submit">
          <Check size={16} />
          Save product
        </button>
      </form>
    </section>
  )
}

function CustomerManager({
  compact,
  customers,
  onSaveCustomer,
  onSelectCustomer
}: {
  compact?: boolean
  customers: Customer[]
  onSaveCustomer: (draft: CustomerDraft) => void
  onSelectCustomer: (customerId: string) => void
}) {
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<CustomerDraft>(emptyCustomerDraft())
  const [errors, setErrors] = useState<string[]>([])
  const filteredCustomers = useMemo(
    () => customers.filter((customer) => customer.name.toLowerCase().includes(search.toLowerCase())).slice(0, compact ? 3 : 6),
    [compact, customers, search]
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validateCustomerDraft(draft)
    if (!validation.valid) {
      setErrors(issueMessages(validation))
      return
    }
    setErrors([])
    onSaveCustomer(draft)
    setDraft(emptyCustomerDraft())
  }

  return (
    <section className="panel-card exact-card management-card">
      <div className="panel-topline">
        <h3>Customers</h3>
        <button type="button" onClick={() => setDraft(emptyCustomerDraft())}>
          New
        </button>
      </div>
      {errors.length > 0 && (
        <div className="form-errors compact-errors" role="alert">
          {errors.map((error) => (
            <span key={error}>{error}</span>
          ))}
        </div>
      )}
      <input className="management-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" />
      <div className="mini-list">
        {filteredCustomers.map((customer) => (
          <button key={customer.id} type="button" onClick={() => onSelectCustomer(customer.id)}>
            <span>{customer.name}</span>
            <b>{customer.phone || 'No phone'}</b>
          </button>
        ))}
      </div>
      <form className="management-form" onSubmit={handleSubmit}>
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Customer name" />
        <input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Phone" />
        {!compact && <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Notes" />}
        <button className="mini-save-button" type="submit">
          <Check size={16} />
          Save customer
        </button>
      </form>
    </section>
  )
}

function CustomerLedgerPanel({
  ledger,
  onClose,
  onCopyReminder,
  onRecordDebt,
  onRecordSale
}: {
  ledger: import('../types').CustomerLedger
  onClose: () => void
  onCopyReminder: (message: string) => void
  onRecordDebt: () => void
  onRecordSale: () => void
}) {
  return (
    <section className="panel-card exact-card ledger-card">
      <div className="panel-topline">
        <h3>{ledger.customer.name}</h3>
        <button type="button" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="ledger-metrics">
        <span>
          <b>{formatNaira(ledger.outstandingBalance)}</b>
          Outstanding
        </span>
        <span>
          <b>{formatNaira(ledger.totalSales)}</b>
          Sales
        </span>
        <span>
          <b>{ledger.evidenceCount}</b>
          Evidence
        </span>
      </div>
      <div className="detail-actions">
        <button className="upload-button" type="button" onClick={onRecordSale}>
          <ShoppingCart size={17} />
          Sale
        </button>
        <button className="upload-button" type="button" onClick={onRecordDebt}>
          <UserPlus size={17} />
          Debt
        </button>
      </div>
      <button className="outline-action green-outline" type="button" onClick={() => onCopyReminder(ledger.reminderText)}>
        <MessageCircle size={17} />
        Copy Reminder
        <ChevronRight size={17} />
      </button>
      <div className="ledger-list">
        {ledger.entries.length ? (
          ledger.entries.slice(0, 6).map((entry) => (
            <div key={`${entry.type}-${entry.id}`} className="ledger-entry">
              <span>{entry.title}</span>
              <b>{formatNaira(entry.amount)}</b>
              <small>{entry.meta}</small>
            </div>
          ))
        ) : (
          <p className="empty-copy">No history for this customer yet.</p>
        )}
      </div>
    </section>
  )
}

function DailyCloseoutPanel({
  closeout,
  onShare,
  shareMessage
}: {
  closeout: import('../types').DailyCloseout
  onShare: () => void
  shareMessage: string
}) {
  const shareText = buildWhatsAppCloseoutText(closeout)

  return (
    <section className="panel-card exact-card closeout-card">
      <div className="panel-topline">
        <h3>Close Today</h3>
        <button type="button" onClick={onShare}>
          Share
        </button>
      </div>
      <div className="closeout-grid">
        <span>
          <b>{formatNaira(closeout.salesTotal)}</b>
          Sales
        </span>
        <span>
          <b>{formatNaira(closeout.estimatedProfit)}</b>
          Profit
        </span>
        <span>
          <b>{formatNaira(closeout.expensesTotal)}</b>
          Expenses
        </span>
        <span>
          <b>{formatNaira(closeout.debtsCreated)}</b>
          New debt
        </span>
      </div>
      <div className="payment-breakdown">
        <span>Cash {formatNaira(closeout.paymentBreakdown.cash)}</span>
        <span>Transfer {formatNaira(closeout.paymentBreakdown.transfer)}</span>
        <span>POS {formatNaira(closeout.paymentBreakdown.pos)}</span>
        <span>Credit {formatNaira(closeout.paymentBreakdown.credit)}</span>
      </div>
      {closeout.warnings.length > 0 && (
        <div className="closeout-warnings">
          {closeout.warnings.map((warning) => (
            <span key={warning}>
              <AlertTriangle size={14} />
              {warning}
            </span>
          ))}
        </div>
      )}
      <textarea className="share-preview" readOnly value={shareText} />
      {shareMessage && <p className="auth-message">{shareMessage}</p>}
    </section>
  )
}

function RecordDetailPanel({
  detail,
  voidReason,
  onChangeVoidReason,
  onClose,
  onCorrect,
  onVoid
}: {
  detail: RecordDetail
  voidReason: string
  onChangeVoidReason: (reason: string) => void
  onClose: () => void
  onCorrect: () => void
  onVoid: () => void
}) {
  return (
    <section className="panel-card exact-card record-detail-card">
      <div className="panel-topline">
        <h3>{detail.title}</h3>
        <button type="button" onClick={onClose}>
          <X size={16} />
        </button>
      </div>
      <div className="record-detail-grid">
        <span>Status</span>
        <strong>{detail.status}</strong>
        <span>Value</span>
        <strong>{detail.amount}</strong>
        <span>Evidence</span>
        <strong>{detail.evidenceCount} attached</strong>
      </div>
      <p className="empty-copy">{detail.meta}</p>
      {detail.isVoid ? (
        <p className="void-note">
          <AlertTriangle size={16} />
          {detail.voidReason || 'This record has been voided.'}
        </p>
      ) : (
        <>
          <textarea className="void-reason" value={voidReason} onChange={(event) => onChangeVoidReason(event.target.value)} placeholder="Reason for voiding, if needed" />
          <div className="detail-actions">
            <button className="upload-button" type="button" onClick={onCorrect}>
              <Edit3 size={17} />
              Correct
            </button>
            <button className="danger-action" type="button" onClick={onVoid}>
              <AlertTriangle size={17} />
              Void
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function detailFromSale(sale: Sale): RecordDetail {
  const firstItem = sale.items[0]
  return {
    id: sale.id,
    type: 'sale',
    title: firstItem?.name || 'Sale record',
    meta: `${sale.customerName} - ${sale.paymentStatus}`,
    amount: formatNaira(sale.total),
    status: sale.isVoid ? 'Voided' : statusLabel(sale.status),
    evidenceCount: sale.evidenceCount,
    isVoid: sale.isVoid,
    voidReason: sale.voidReason,
    correctionDraft: {
      type: 'sale',
      summary: `Correction for sale ${sale.id}`,
      customerName: sale.customerName,
      itemName: firstItem?.name.replace(/^\d+(\.\d+)?\s+/, '') || 'Sale item',
      quantity: String(firstItem?.quantity || 1),
      unitPrice: String(firstItem?.unitPrice || sale.total),
      unitCost: String(firstItem?.unitCost || 0),
      amount: String(sale.total),
      paidAmount: String(sale.paidAmount),
      paymentMethod: sale.paymentMethod,
      expenseCategory: 'Sales',
      stockUnit: 'items',
      note: 'Corrected owner-reviewed record.',
      productId: firstItem?.productId,
      correctsRecordType: 'sale',
      correctsRecordId: sale.id
    }
  }
}

function detailFromExpense(expense: Expense): RecordDetail {
  return {
    id: expense.id,
    type: 'expense',
    title: expense.label,
    meta: expense.category,
    amount: formatNaira(expense.amount),
    status: expense.isVoid ? 'Voided' : statusLabel(expense.status),
    evidenceCount: expense.evidenceCount,
    isVoid: expense.isVoid,
    voidReason: expense.voidReason,
    correctionDraft: {
      type: 'expense',
      summary: `Correction for expense ${expense.id}`,
      customerName: '',
      itemName: expense.label,
      quantity: '1',
      unitPrice: '',
      unitCost: '',
      amount: String(expense.amount),
      paidAmount: String(expense.amount),
      paymentMethod: expense.paymentMethod,
      expenseCategory: expense.category,
      stockUnit: 'items',
      note: 'Corrected owner-reviewed record.',
      correctsRecordType: 'expense',
      correctsRecordId: expense.id
    }
  }
}

function detailFromDebt(debt: DebtRecord): RecordDetail {
  return {
    id: debt.id,
    type: 'debt',
    title: debt.customerName,
    meta: debt.lastActivity,
    amount: formatNaira(Math.max(debt.amount - debt.paidAmount, 0)),
    status: debt.isVoid ? 'Voided' : statusLabel(debt.status),
    evidenceCount: debt.evidenceCount,
    isVoid: debt.isVoid,
    voidReason: debt.voidReason,
    correctionDraft: {
      type: 'debt',
      summary: `Correction for debt ${debt.id}`,
      customerId: debt.customerId,
      customerName: debt.customerName,
      itemName: debt.lastActivity,
      quantity: '1',
      unitPrice: '',
      unitCost: '',
      amount: String(debt.amount),
      paidAmount: String(debt.paidAmount),
      paymentMethod: 'credit',
      expenseCategory: 'Debt',
      stockUnit: 'items',
      note: 'Corrected owner-reviewed record.',
      correctsRecordType: 'debt',
      correctsRecordId: debt.id
    }
  }
}

function detailFromStock(movement: StockMovement): RecordDetail {
  return {
    id: movement.id,
    type: 'stock',
    title: movement.productName,
    meta: movement.note || `${movement.quantity} ${movement.unit}`,
    amount: formatNaira(movement.quantity * movement.unitCost),
    status: movement.isVoid ? 'Voided' : statusLabel(movement.status),
    evidenceCount: movement.evidenceCount,
    isVoid: movement.isVoid,
    voidReason: movement.voidReason,
    correctionDraft: {
      type: 'stock',
      summary: `Correction for stock ${movement.id}`,
      customerName: '',
      productId: movement.productId,
      itemName: movement.productName,
      quantity: String(movement.quantity),
      unitPrice: '',
      unitCost: String(movement.unitCost),
      amount: String(movement.quantity * movement.unitCost),
      paidAmount: '',
      paymentMethod: 'transfer',
      expenseCategory: 'Stock purchase',
      stockUnit: movement.unit,
      note: 'Corrected owner-reviewed record.',
      correctsRecordType: 'stock',
      correctsRecordId: movement.id
    }
  }
}

function activeSales(sales: Sale[]) {
  return sales.filter((sale) => !sale.isVoid)
}

function emptyProductDraft(): ProductDraft {
  return {
    name: '',
    category: 'General',
    stock: '0',
    reorderPoint: '5',
    unit: 'items',
    unitCost: '0',
    sellingPrice: '0'
  }
}

function productToDraft(product: Product): ProductDraft {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    stock: String(product.stock),
    reorderPoint: String(product.reorderPoint),
    unit: product.unit,
    unitCost: String(product.unitCost),
    sellingPrice: String(product.sellingPrice)
  }
}

function emptyCustomerDraft(): CustomerDraft {
  return {
    name: '',
    phone: '',
    notes: ''
  }
}
