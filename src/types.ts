export type MetricTone = 'green' | 'amber' | 'coral' | 'blue'

export type AuthMode = 'login' | 'create'

export type RecordKind = 'sale' | 'expense' | 'stock' | 'debt'

export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'credit'

export type RecordStatus = 'draft' | 'recorded' | 'evidence_attached' | 'customer_confirmed' | 'externally_verified'

export type CurrencyCode = 'NGN' | 'USD' | 'GBP'

export type CountryCode = 'NG' | 'US' | 'GB' | 'OTHER'

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
  address: string
  country: CountryCode
  stateRegion: string
  currency: CurrencyCode
  operatingNote: string
  setupComplete: boolean
}

export interface BusinessSetupDraft {
  name: string
  businessType: string
  ownerName: string
  location: string
  address: string
  country: CountryCode
  stateRegion: string
  currency: CurrencyCode
}

export interface Customer {
  id: string
  name: string
  phone?: string
  initials: string
  notes?: string
  createdAt?: string
  updatedAt?: string
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
  createdAt?: string
  updatedAt?: string
}

export interface SaleItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  unitCost?: number
}

export interface RecordLifecycle {
  isVoid: boolean
  voidReason?: string
  voidedAt?: string
  voidedBy?: string
  correctedByRecordType?: RecordKind
  correctedByRecordId?: string
}

export interface Sale extends RecordLifecycle {
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

export interface DebtRecord extends RecordLifecycle {
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

export interface Expense extends RecordLifecycle {
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
  storagePath?: string
  fileName?: string
  mimeType?: string
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
  productId?: string
  customerId?: string
  scanDraftId?: string
  correctsRecordType?: RecordKind
  correctsRecordId?: string
}

export interface ScanDraft {
  id?: string
  image: CapturedImage
  entry: ReviewEntryDraft
  status?: RecordStatus
  imagePath?: string
  createdAt?: string
  reviewedAt?: string
}

export interface PersistedScanDraft {
  id: string
  source: ScanSource
  status: RecordStatus
  imagePath?: string
  imageUrl?: string
  entryType: RecordKind
  extractedSummary?: string
  reviewedRecordType?: RecordKind
  reviewedRecordId?: string
  createdAt: string
  reviewedAt?: string
}

export interface ProductDraft {
  id?: string
  name: string
  category: string
  stock: string
  reorderPoint: string
  unit: string
  unitCost: string
  sellingPrice: string
}

export interface CustomerDraft {
  id?: string
  name: string
  phone: string
  notes: string
}

export interface ValidationIssue {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

export interface StockMovement extends RecordLifecycle {
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

export interface CustomerLedgerEntry {
  id: string
  type: RecordKind
  title: string
  meta: string
  amount: number
  status: RecordStatus
  isVoid: boolean
  createdAt: string
}

export interface CustomerLedger {
  customer: Customer
  currency: CurrencyCode
  totalSales: number
  outstandingBalance: number
  evidenceCount: number
  entries: CustomerLedgerEntry[]
  reminderText: string
}

export interface PaymentBreakdown {
  cash: number
  transfer: number
  pos: number
  credit: number
}

export interface DailyCloseout {
  businessName: string
  dateLabel: string
  currency: CurrencyCode
  salesTotal: number
  estimatedProfit: number
  expensesTotal: number
  ownerWithdrawalTotal: number
  stockAddedValue: number
  debtsCreated: number
  draftCount: number
  paymentBreakdown: PaymentBreakdown
  lowStockCount: number
  warnings: string[]
}

export interface MarketRecords {
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  debts: DebtRecord[]
  expenses: Expense[]
  stockMovements: StockMovement[]
  evidence: TransactionEvidence[]
  scanDrafts: PersistedScanDraft[]
  activityLog: ActivityLogEntry[]
}
