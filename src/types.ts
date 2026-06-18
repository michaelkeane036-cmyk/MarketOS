export type MetricTone = 'green' | 'amber' | 'coral' | 'blue'

export type AuthMode = 'login' | 'create'

export type RecordKind = 'sale' | 'expense' | 'stock' | 'debt'

export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'credit'

export type RecordStatus = 'draft' | 'recorded' | 'evidence_attached' | 'customer_confirmed' | 'externally_verified'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface AuthSession {
  user: AuthUser
  provider: 'demo' | 'supabase'
}

export interface BusinessProfile {
  id: string
  name: string
  businessType: string
  ownerName: string
  location: string
  currency: 'NGN'
  operatingNote: string
  setupComplete: boolean
}

export interface BusinessSetupDraft {
  name: string
  businessType: string
  ownerName: string
  location: string
  currency: 'NGN'
}

export interface Customer {
  id: string
  name: string
  phone?: string
  initials: string
  notes?: string
}

export interface Product {
  id: string
  name: string
  category: string
  stock: number
  reorderPoint: number
  unit: string
  unitCost: number
  sellingPrice: number
  iconLabel: string
}

export interface SaleItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

export interface Sale {
  id: string
  status: RecordStatus
  source: 'manual' | 'scan'
  customerName: string
  items: SaleItem[]
  total: number
  profit: number
  paidAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: 'paid' | 'partial' | 'owed'
  balanceOwed?: number
  evidenceCount: number
  time: string
  createdAt: string
}

export interface DebtRecord {
  id: string
  status: RecordStatus
  customerId: string
  customerName: string
  initials: string
  amount: number
  paidAmount: number
  sinceLabel: string
  lastActivity: string
  evidenceCount: number
  createdAt: string
}

export interface Expense {
  id: string
  status: RecordStatus
  source: 'manual' | 'scan'
  label: string
  amount: number
  category: string
  paymentMethod: PaymentMethod
  evidenceCount: number
  time: string
  createdAt: string
}

export interface StockAlert {
  id: string
  productName: string
  stock: number
  reorderPoint: number
  unit: string
  iconLabel: string
}

export interface DashboardMetric {
  id: string
  label: string
  value: string
  detail: string
  trend: string
  tone: MetricTone
}

export type ScanSource = 'camera' | 'upload' | 'manual_upload'

export interface CapturedImage {
  source: ScanSource
  dataUrl: string
  capturedAt: string
}

export interface ReviewEntryDraft {
  type: RecordKind
  summary: string
  customerName: string
  itemName: string
  quantity: string
  unitPrice: string
  unitCost: string
  amount: string
  paidAmount: string
  paymentMethod: PaymentMethod
  expenseCategory: string
  stockUnit: string
  note: string
  evidence?: CapturedImage
}

export interface ScanDraft {
  image: CapturedImage
  entry: ReviewEntryDraft
}

export interface StockMovement {
  id: string
  status: RecordStatus
  productId: string
  productName: string
  quantity: number
  unit: string
  unitCost: number
  movementType: 'in' | 'out' | 'adjustment'
  note: string
  evidenceCount: number
  createdAt: string
}

export interface TransactionEvidence {
  id: string
  recordType: RecordKind
  recordId: string
  source: ScanSource | 'manual_upload'
  dataUrl: string
  capturedAt: string
}

export interface ActivityLogEntry {
  id: string
  recordType: RecordKind | 'setup'
  recordId: string
  label: string
  amount?: number
  status: RecordStatus
  createdAt: string
}

export interface RecentRecord {
  id: string
  type: RecordKind
  title: string
  meta: string
  value: string
  tone: MetricTone
  avatar: string
  status: RecordStatus
}

export interface MarketRecords {
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  debts: DebtRecord[]
  expenses: Expense[]
  stockMovements: StockMovement[]
  evidence: TransactionEvidence[]
  activityLog: ActivityLogEntry[]
}
