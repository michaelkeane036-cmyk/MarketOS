import type {
  ActivityLogEntry,
  DashboardMetric,
  DebtRecord,
  MarketRecords,
  Product,
  RecentRecord,
  RecordKind,
  RecordStatus,
  ReviewEntryDraft,
  Sale,
  StockAlert,
  TransactionEvidence
} from '../types'
import { formatNaira, formatTime, parseMoney, parseQuantity } from './format'

export interface DashboardModel {
  metrics: DashboardMetric[]
  stockAlerts: StockAlert[]
  debtRecords: DebtRecord[]
  recentRecords: RecentRecord[]
  ownerWithdrawalTotal: number
  estimatedProfit: number
  draftCount: number
}

export function cloneRecords(records: MarketRecords): MarketRecords {
  return {
    products: records.products.map((product) => ({ ...product })),
    customers: records.customers.map((customer) => ({ ...customer })),
    sales: records.sales.map((sale) => ({ ...sale, items: sale.items.map((item) => ({ ...item })) })),
    debts: records.debts.map((debt) => ({ ...debt })),
    expenses: records.expenses.map((expense) => ({ ...expense })),
    stockMovements: records.stockMovements.map((movement) => ({ ...movement })),
    evidence: records.evidence.map((evidence) => ({ ...evidence })),
    activityLog: records.activityLog.map((activity) => ({ ...activity }))
  }
}

export function statusLabel(status: RecordStatus) {
  const labels: Record<RecordStatus, string> = {
    draft: 'Draft',
    recorded: 'Recorded',
    evidence_attached: 'Evidence attached',
    customer_confirmed: 'Customer confirmed',
    externally_verified: 'Verified externally'
  }

  return labels[status]
}

export function createDraftForKind(type: RecordKind): ReviewEntryDraft {
  const base = {
    type,
    summary: '',
    customerName: '',
    itemName: '',
    quantity: '1',
    unitPrice: '',
    unitCost: '',
    amount: '',
    paidAmount: '',
    paymentMethod: 'cash' as const,
    expenseCategory: '',
    stockUnit: 'pieces',
    note: ''
  }

  if (type === 'sale') {
    return {
      ...base,
      summary: 'Review sale before saving.',
      customerName: 'Walk-in customer',
      itemName: 'Shirts',
      quantity: '1',
      unitPrice: '15000',
      unitCost: '11000',
      amount: '15000',
      paidAmount: '15000',
      expenseCategory: 'Sales'
    }
  }

  if (type === 'expense') {
    return {
      ...base,
      summary: 'Review expense before saving.',
      itemName: 'Shop expense',
      amount: '5000',
      paidAmount: '5000',
      expenseCategory: 'Operations',
      paymentMethod: 'transfer'
    }
  }

  if (type === 'stock') {
    return {
      ...base,
      summary: 'Review stock addition before saving.',
      itemName: 'Noodles',
      quantity: '12',
      unitCost: '720',
      amount: '8640',
      expenseCategory: 'Stock purchase',
      stockUnit: 'packs',
      paymentMethod: 'transfer'
    }
  }

  return {
    ...base,
    summary: 'Review debt before saving.',
    customerName: 'Mama B',
    itemName: 'Goods supplied',
    amount: '10000',
    paidAmount: '0',
    paymentMethod: 'credit',
    expenseCategory: 'Debt'
  }
}

export function buildDashboardModel(records: MarketRecords): DashboardModel {
  const salesTotal = records.sales.reduce((total, sale) => total + sale.total, 0)
  const estimatedProfit = records.sales.reduce((total, sale) => total + sale.profit, 0)
  const debtsTotal = records.debts.reduce((total, debt) => total + Math.max(debt.amount - debt.paidAmount, 0), 0)
  const ownerWithdrawalTotal = records.expenses
    .filter((expense) => expense.category.toLowerCase().includes('draw') || expense.label.toLowerCase().includes('withdraw'))
    .reduce((total, expense) => total + expense.amount, 0)

  const stockAlerts = records.products
    .filter((product) => product.stock <= product.reorderPoint)
    .map((product) => ({
      id: `alert-${product.id}`,
      productName: product.name,
      stock: product.stock,
      reorderPoint: product.reorderPoint,
      unit: product.unit,
      iconLabel: product.iconLabel
    }))

  const metrics: DashboardMetric[] = [
    {
      id: 'sales',
      label: 'Sales',
      value: formatNaira(salesTotal),
      detail: 'saved today',
      trend: `${records.sales.length} records`,
      tone: 'green'
    },
    {
      id: 'profit',
      label: 'Profit',
      value: formatNaira(estimatedProfit),
      detail: 'estimated',
      trend: 'reviewed',
      tone: 'green'
    },
    {
      id: 'debts',
      label: 'Debts',
      value: formatNaira(debtsTotal),
      detail: 'unpaid balance',
      trend: debtsTotal > 0 ? 'follow up' : 'clear',
      tone: debtsTotal > 0 ? 'coral' : 'green'
    },
    {
      id: 'stock',
      label: 'Low Stock',
      value: String(stockAlerts.length),
      detail: 'items',
      trend: stockAlerts.length ? 'need restock' : 'healthy',
      tone: stockAlerts.length ? 'amber' : 'green'
    }
  ]

  const recentRecords = records.activityLog
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 4)
    .map((activity) => toRecentRecord(activity))

  return {
    metrics,
    stockAlerts,
    debtRecords: records.debts,
    recentRecords,
    ownerWithdrawalTotal,
    estimatedProfit,
    draftCount: records.activityLog.filter((activity) => activity.status === 'draft').length
  }
}

export function applyReviewedRecord(records: MarketRecords, draft: ReviewEntryDraft, source: 'manual' | 'scan') {
  const next = cloneRecords(records)
  const createdAt = new Date().toISOString()
  const status: RecordStatus = draft.evidence ? 'evidence_attached' : 'recorded'
  const id = `${draft.type}-${Date.now()}`
  const evidenceCount = draft.evidence ? 1 : 0

  if (draft.type === 'sale') {
    const quantity = Math.max(parseQuantity(draft.quantity), 1)
    const unitPrice = parseMoney(draft.unitPrice) || parseMoney(draft.amount)
    const unitCost = parseMoney(draft.unitCost)
    const total = parseMoney(draft.amount) || quantity * unitPrice
    const paidAmount = Math.min(parseMoney(draft.paidAmount) || total, total)
    const balanceOwed = Math.max(total - paidAmount, 0)
    const product = findOrCreateProduct(next.products, draft.itemName, draft.stockUnit, unitCost, unitPrice)
    product.stock = Math.max(product.stock - quantity, 0)

    const sale: Sale = {
      id,
      status,
      source,
      customerName: draft.customerName || 'Walk-in customer',
      items: [
        {
          productId: product.id,
          name: `${quantity} ${draft.itemName || product.name}`,
          quantity,
          unitPrice
        }
      ],
      total,
      profit: Math.max((unitPrice - unitCost) * quantity, 0),
      paidAmount,
      paymentMethod: balanceOwed > 0 ? 'credit' : draft.paymentMethod,
      paymentStatus: balanceOwed <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'owed',
      balanceOwed: balanceOwed || undefined,
      evidenceCount,
      time: formatTime(),
      createdAt
    }
    next.sales.unshift(sale)

    if (balanceOwed > 0) {
      const customerName = draft.customerName || 'Customer'
      next.debts.unshift({
        id: `debt-${Date.now()}`,
        status,
        customerId: slugify(customerName),
        customerName,
        initials: initialsFor(customerName),
        amount: balanceOwed,
        paidAmount: 0,
        sinceLabel: 'Owes since today',
        lastActivity: draft.itemName || draft.summary,
        evidenceCount,
        createdAt
      })
    }

    pushEvidence(next, draft, 'sale', sale.id)
    pushActivity(next, 'sale', sale.id, `Sale recorded for ${sale.customerName}`, total, status, createdAt)
    return next
  }

  if (draft.type === 'expense') {
    const amount = parseMoney(draft.amount)
    const expense = {
      id,
      status,
      source,
      label: draft.itemName || draft.summary || 'Business expense',
      amount,
      category: draft.expenseCategory || 'Operations',
      paymentMethod: draft.paymentMethod,
      evidenceCount,
      time: formatTime(),
      createdAt
    }
    next.expenses.unshift(expense)
    pushEvidence(next, draft, 'expense', expense.id)
    pushActivity(next, 'expense', expense.id, `Expense recorded: ${expense.label}`, amount, status, createdAt)
    return next
  }

  if (draft.type === 'stock') {
    const quantity = Math.max(parseQuantity(draft.quantity), 1)
    const unitCost = parseMoney(draft.unitCost)
    const product = findOrCreateProduct(next.products, draft.itemName, draft.stockUnit, unitCost, parseMoney(draft.unitPrice))
    product.stock += quantity
    product.unitCost = unitCost || product.unitCost

    const movement = {
      id,
      status,
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit,
      unitCost,
      movementType: 'in' as const,
      note: draft.note || draft.summary,
      evidenceCount,
      createdAt
    }
    next.stockMovements.unshift(movement)
    pushEvidence(next, draft, 'stock', movement.id)
    pushActivity(next, 'stock', movement.id, `Stock added: ${product.name}`, quantity * unitCost, status, createdAt)
    return next
  }

  const customerName = draft.customerName || 'Customer'
  const debt = {
    id,
    status,
    customerId: slugify(customerName),
    customerName,
    initials: initialsFor(customerName),
    amount: parseMoney(draft.amount),
    paidAmount: parseMoney(draft.paidAmount),
    sinceLabel: 'Owes since today',
    lastActivity: draft.itemName || draft.summary || 'Manual debt record',
    evidenceCount,
    createdAt
  }
  next.debts.unshift(debt)
  pushEvidence(next, draft, 'debt', debt.id)
  pushActivity(next, 'debt', debt.id, `Debt recorded for ${customerName}`, debt.amount, status, createdAt)
  return next
}

function toRecentRecord(activity: ActivityLogEntry): RecentRecord {
  const tone = activity.recordType === 'expense' || activity.recordType === 'debt' ? 'coral' : activity.recordType === 'stock' ? 'amber' : 'green'
  return {
    id: activity.id,
    type: activity.recordType === 'setup' ? 'sale' : activity.recordType,
    title: activity.label,
    meta: statusLabel(activity.status),
    value: typeof activity.amount === 'number' ? formatNaira(activity.amount) : '',
    tone,
    avatar: activity.recordType.slice(0, 2).toUpperCase(),
    status: activity.status
  }
}

function findOrCreateProduct(products: Product[], name: string, unit: string, unitCost: number, unitPrice: number) {
  const productName = name || 'General item'
  const existing = products.find((product) => product.name.toLowerCase() === productName.toLowerCase())
  if (existing) return existing

  const product: Product = {
    id: slugify(productName),
    name: productName,
    category: 'General',
    stock: 0,
    reorderPoint: 5,
    unit: unit || 'items',
    unitCost,
    sellingPrice: unitPrice || unitCost,
    iconLabel: initialsFor(productName)
  }
  products.unshift(product)
  return product
}

function pushEvidence(records: MarketRecords, draft: ReviewEntryDraft, recordType: RecordKind, recordId: string) {
  if (!draft.evidence) return

  const evidence: TransactionEvidence = {
    id: `evidence-${Date.now()}`,
    recordType,
    recordId,
    source: draft.evidence.source,
    dataUrl: draft.evidence.dataUrl,
    capturedAt: draft.evidence.capturedAt
  }
  records.evidence.unshift(evidence)
}

function pushActivity(
  records: MarketRecords,
  recordType: RecordKind,
  recordId: string,
  label: string,
  amount: number,
  status: RecordStatus,
  createdAt: string
) {
  records.activityLog.unshift({
    id: `activity-${Date.now()}`,
    recordType,
    recordId,
    label,
    amount,
    status,
    createdAt
  })
}

function initialsFor(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .padEnd(1, 'I')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
