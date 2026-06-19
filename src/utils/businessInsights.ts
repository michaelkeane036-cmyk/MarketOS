import type { BusinessProfile, Customer, CustomerLedger, DailyCloseout, MarketRecords, PaymentBreakdown } from '../types'
import { formatNaira } from './format'
import { statusLabel } from './records'

export function buildCustomerLedger(customer: Customer, records: MarketRecords): CustomerLedger {
  const normalizedName = normalize(customer.name)
  const sales = records.sales.filter((sale) => normalize(sale.customerName) === normalizedName)
  const debts = records.debts.filter((debt) => normalize(debt.customerName) === normalizedName || debt.customerId === customer.id)

  const activeSales = sales.filter((sale) => !sale.isVoid)
  const activeDebts = debts.filter((debt) => !debt.isVoid)
  const totalSales = activeSales.reduce((total, sale) => total + sale.total, 0)
  const saleBalances = activeSales.reduce((total, sale) => total + (sale.balanceOwed ?? 0), 0)
  const debtBalances = activeDebts.reduce((total, debt) => total + Math.max(debt.amount - debt.paidAmount, 0), 0)
  const outstandingBalance = saleBalances + debtBalances
  const evidenceCount =
    sales.reduce((total, sale) => total + sale.evidenceCount, 0) + debts.reduce((total, debt) => total + debt.evidenceCount, 0)

  const saleEntries = sales.map((sale) => ({
    id: sale.id,
    type: 'sale' as const,
    title: sale.items[0]?.name || 'Sale record',
    meta: `${sale.paymentStatus} - ${sale.isVoid ? 'Voided' : statusLabel(sale.status)}`,
    amount: sale.total,
    status: sale.status,
    isVoid: sale.isVoid,
    createdAt: sale.createdAt
  }))

  const debtEntries = debts.map((debt) => ({
    id: debt.id,
    type: 'debt' as const,
    title: debt.lastActivity || 'Debt record',
    meta: `${debt.sinceLabel} - ${debt.isVoid ? 'Voided' : statusLabel(debt.status)}`,
    amount: Math.max(debt.amount - debt.paidAmount, 0),
    status: debt.status,
    isVoid: debt.isVoid,
    createdAt: debt.createdAt
  }))

  const entries = [...saleEntries, ...debtEntries].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  const reminderText =
    outstandingBalance > 0
      ? `Hello ${customer.name}, this is a reminder that your outstanding balance with us is ${formatNaira(outstandingBalance)}. Thank you.`
      : `Hello ${customer.name}, your balance with us is currently clear. Thank you.`

  return {
    customer,
    totalSales,
    outstandingBalance,
    evidenceCount,
    entries,
    reminderText
  }
}

export function buildDailyCloseout(records: MarketRecords, business: BusinessProfile, date = new Date()): DailyCloseout {
  const dateKey = toDateKey(date)
  const todaySales = records.sales.filter((sale) => !sale.isVoid && toDateKey(new Date(sale.createdAt)) === dateKey)
  const todayExpenses = records.expenses.filter((expense) => !expense.isVoid && toDateKey(new Date(expense.createdAt)) === dateKey)
  const todayDebts = records.debts.filter((debt) => !debt.isVoid && toDateKey(new Date(debt.createdAt)) === dateKey)
  const todayStock = records.stockMovements.filter((movement) => !movement.isVoid && toDateKey(new Date(movement.createdAt)) === dateKey)
  const paymentBreakdown = todaySales.reduce<PaymentBreakdown>(
    (breakdown, sale) => {
      breakdown[sale.paymentMethod] += sale.paymentMethod === 'credit' ? sale.total : sale.paidAmount
      return breakdown
    },
    { cash: 0, transfer: 0, pos: 0, credit: 0 }
  )
  const salesTotal = todaySales.reduce((total, sale) => total + sale.total, 0)
  const estimatedProfit = todaySales.reduce((total, sale) => total + sale.profit, 0)
  const expensesTotal = todayExpenses.reduce((total, expense) => total + expense.amount, 0)
  const ownerWithdrawalTotal = todayExpenses
    .filter((expense) => expense.category.toLowerCase().includes('draw') || expense.label.toLowerCase().includes('withdraw'))
    .reduce((total, expense) => total + expense.amount, 0)
  const stockAddedValue = todayStock.reduce((total, movement) => total + movement.quantity * movement.unitCost, 0)
  const debtsCreated = todayDebts.reduce((total, debt) => total + Math.max(debt.amount - debt.paidAmount, 0), 0)
  const draftCount = records.scanDrafts.filter((draft) => draft.status === 'draft').length
  const lowStockCount = records.products.filter((product) => product.stock <= product.reorderPoint).length
  const warnings: string[] = []

  if (draftCount > 0) warnings.push(`${draftCount} scan draft${draftCount === 1 ? '' : 's'} still need review.`)
  if (ownerWithdrawalTotal > estimatedProfit) warnings.push('Withdrawals are above estimated profit today.')
  if (lowStockCount > 0) warnings.push(`${lowStockCount} product${lowStockCount === 1 ? '' : 's'} need restock attention.`)

  return {
    businessName: business.name,
    dateLabel: new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium' }).format(date),
    salesTotal,
    estimatedProfit,
    expensesTotal,
    ownerWithdrawalTotal,
    stockAddedValue,
    debtsCreated,
    draftCount,
    paymentBreakdown,
    lowStockCount,
    warnings
  }
}

export function buildWhatsAppCloseoutText(closeout: DailyCloseout) {
  const lines = [
    `MarketOS Daily Summary - ${closeout.businessName}`,
    closeout.dateLabel,
    '',
    `Sales: ${formatNaira(closeout.salesTotal)}`,
    `Estimated profit: ${formatNaira(closeout.estimatedProfit)}`,
    `Expenses: ${formatNaira(closeout.expensesTotal)}`,
    `Owner withdrawals: ${formatNaira(closeout.ownerWithdrawalTotal)}`,
    `Stock added: ${formatNaira(closeout.stockAddedValue)}`,
    `Debts created: ${formatNaira(closeout.debtsCreated)}`,
    '',
    'Payment breakdown:',
    `Cash: ${formatNaira(closeout.paymentBreakdown.cash)}`,
    `Transfer: ${formatNaira(closeout.paymentBreakdown.transfer)}`,
    `POS: ${formatNaira(closeout.paymentBreakdown.pos)}`,
    `Credit/customer owes: ${formatNaira(closeout.paymentBreakdown.credit)}`,
    '',
    `Low stock alerts: ${closeout.lowStockCount}`,
    `Drafts waiting review: ${closeout.draftCount}`
  ]

  if (closeout.warnings.length) {
    lines.push('', 'Attention:', ...closeout.warnings.map((warning) => `- ${warning}`))
  }

  lines.push('', 'Records only. Money stays with bank, POS, transfer, or cash drawer.')
  return lines.join('\n')
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}
