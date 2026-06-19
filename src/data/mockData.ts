import type {
  BusinessProfile,
  Customer,
  DashboardMetric,
  DebtRecord,
  Expense,
  MarketRecords,
  Product,
  ReviewEntryDraft,
  Sale,
  StockAlert,
  StockMovement
} from '../types'

const now = new Date().toISOString()

export const business: BusinessProfile = {
  id: 'ayo-stores',
  name: 'Ayo Stores',
  businessType: 'Neighborhood provisions store',
  ownerName: 'Ayo',
  location: 'Yaba, Lagos',
  address: 'Yaba market area',
  country: 'NG',
  stateRegion: 'Lagos',
  currency: 'NGN',
  operatingNote: 'No wallet - records only',
  setupComplete: false
}

export const customers: Customer[] = [
  {
    id: 'customer-tolu',
    name: 'Tolu',
    initials: 'T',
    phone: '+234 800 000 0001'
  },
  {
    id: 'customer-mama-b',
    name: 'Mama B',
    initials: 'M',
    phone: '+234 800 000 0002'
  }
]

export const products: Product[] = [
  {
    id: 'rice-50kg',
    name: 'Rice (50kg)',
    category: 'Foodstuff',
    stock: 8,
    reorderPoint: 12,
    unit: 'bags',
    unitCost: 72000,
    sellingPrice: 78000,
    iconLabel: 'Ri'
  },
  {
    id: 'noodles-pack',
    name: 'Noodles',
    category: 'Foodstuff',
    stock: 12,
    reorderPoint: 20,
    unit: 'packs',
    unitCost: 720,
    sellingPrice: 900,
    iconLabel: 'No'
  },
  {
    id: 'shirts',
    name: 'Shirts',
    category: 'Fashion',
    stock: 18,
    reorderPoint: 8,
    unit: 'pieces',
    unitCost: 11000,
    sellingPrice: 15000,
    iconLabel: 'Ts'
  }
]

export const recentSales: Sale[] = [
  {
    id: 'sale-shirts',
    status: 'evidence_attached',
    source: 'manual',
    customerName: 'Tolu',
    items: [{ productId: 'shirts', name: '3 Shirts', quantity: 3, unitPrice: 15000 }],
    total: 45000,
    profit: 12000,
    paidAmount: 35000,
    paymentMethod: 'transfer',
    paymentStatus: 'partial',
    balanceOwed: 10000,
    evidenceCount: 1,
    time: '9:30 AM',
    createdAt: now,
    isVoid: false
  },
  {
    id: 'sale-rice',
    status: 'recorded',
    source: 'manual',
    customerName: 'Walk-in customer',
    items: [{ productId: 'rice-50kg', name: '2 Bags of Rice', quantity: 2, unitPrice: 78000 }],
    total: 156000,
    profit: 12000,
    paidAmount: 156000,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    evidenceCount: 0,
    time: '10:45 AM',
    createdAt: now,
    isVoid: false
  }
]

export const debtRecords: DebtRecord[] = [
  {
    id: 'debt-tolu',
    status: 'evidence_attached',
    customerId: 'customer-tolu',
    customerName: 'Tolu',
    initials: 'T',
    amount: 10000,
    paidAmount: 0,
    sinceLabel: 'Owes since 16 Jun',
    lastActivity: '3 shirts',
    evidenceCount: 1,
    createdAt: now,
    isVoid: false
  },
  {
    id: 'debt-mama-b',
    status: 'recorded',
    customerId: 'customer-mama-b',
    customerName: 'Mama B',
    initials: 'M',
    amount: 32000,
    paidAmount: 0,
    sinceLabel: 'Owes since 14 Jun',
    lastActivity: 'Rice and oil',
    evidenceCount: 0,
    createdAt: now,
    isVoid: false
  }
]

export const expenses: Expense[] = [
  {
    id: 'expense-withdrawal',
    status: 'recorded',
    source: 'manual',
    label: 'Owner withdrawal',
    amount: 25000,
    category: 'Personal draw',
    paymentMethod: 'cash',
    evidenceCount: 0,
    time: '2:10 PM',
    createdAt: now,
    isVoid: false
  }
]

export const stockMovements: StockMovement[] = [
  {
    id: 'stock-rice-opening',
    status: 'recorded',
    productId: 'rice-50kg',
    productName: 'Rice (50kg)',
    quantity: 10,
    unit: 'bags',
    unitCost: 72000,
    movementType: 'in',
    note: 'Opening stock record',
    evidenceCount: 0,
    createdAt: now,
    isVoid: false
  }
]

export const initialRecords: MarketRecords = {
  products,
  customers,
  sales: recentSales,
  debts: debtRecords,
  expenses,
  stockMovements,
  evidence: [],
  scanDrafts: [],
  activityLog: [
    {
      id: 'activity-sale-shirts',
      recordType: 'sale',
      recordId: 'sale-shirts',
      label: 'Sale recorded with evidence attached',
      amount: 45000,
      status: 'evidence_attached',
      createdAt: now
    },
    {
      id: 'activity-expense-withdrawal',
      recordType: 'expense',
      recordId: 'expense-withdrawal',
      label: 'Owner withdrawal recorded',
      amount: 25000,
      status: 'recorded',
      createdAt: now
    }
  ]
}

export const emptyRecords: MarketRecords = {
  products: [],
  customers: [],
  sales: [],
  debts: [],
  expenses: [],
  stockMovements: [],
  evidence: [],
  scanDrafts: [],
  activityLog: []
}

export const metrics: DashboardMetric[] = [
  {
    id: 'sales',
    label: 'Sales',
    value: '\u20a686,500',
    detail: 'from saved records',
    trend: 'recorded',
    tone: 'green'
  },
  {
    id: 'profit',
    label: 'Profit',
    value: '\u20a618,400',
    detail: 'estimated',
    trend: 'reviewed',
    tone: 'green'
  },
  {
    id: 'debts',
    label: 'Debts',
    value: '\u20a642,000',
    detail: 'unpaid balance',
    trend: 'follow up',
    tone: 'coral'
  },
  {
    id: 'stock',
    label: 'Low Stock',
    value: '5',
    detail: 'items',
    trend: 'need restock',
    tone: 'amber'
  }
]

export const stockAlerts: StockAlert[] = products
  .filter((product) => product.stock <= product.reorderPoint)
  .map((product) => ({
    id: `alert-${product.id}`,
    productName: product.name,
    stock: product.stock,
    reorderPoint: product.reorderPoint,
    unit: product.unit,
    iconLabel: product.iconLabel
  }))

export const quickRecordExample = 'Sold 3 shirts 15k each, Tolu owes 10k'

export const defaultReviewDraft: ReviewEntryDraft = {
  type: 'sale',
  summary: 'Sold 3 shirts at 15k each. Tolu owes 10k.',
  customerName: 'Tolu',
  itemName: 'Shirts',
  quantity: '3',
  unitPrice: '15000',
  unitCost: '11000',
  amount: '\u20a645,000',
  paidAmount: '\u20a635,000',
  paymentMethod: 'transfer',
  expenseCategory: 'Sales',
  stockUnit: 'pieces',
  note: 'Manual review required before saving.'
}
