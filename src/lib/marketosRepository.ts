import { business as defaultBusiness, emptyRecords } from '../data/mockData'
import { supabase } from './supabase'
import { applyReviewedRecord, cloneRecords, createDraftForKind, voidLocalRecord } from '../utils/records'
import { formatTime, parseMoney } from '../utils/format'
import type {
  BusinessProfile,
  BusinessSetupDraft,
  CapturedImage,
  Customer,
  CustomerDraft,
  MarketRecords,
  PaymentMethod,
  PersistedScanDraft,
  Product,
  ProductDraft,
  RecordKind,
  RecordLifecycle,
  RecordStatus,
  ReviewEntryDraft,
  Sale,
  SaleItem,
  ScanDraft,
  ScanSource
} from '../types'

interface WorkspaceLoadResult {
  business: BusinessProfile | null
  records: MarketRecords
}

interface SaveRecordInput {
  business: BusinessProfile
  userId: string
  entry: ReviewEntryDraft
  source: 'manual' | 'scan'
}

interface CreateScanDraftInput {
  business: BusinessProfile
  image: CapturedImage
}

type BusinessRow = {
  id: string
  name: string
  business_type: string
  location: string | null
  currency: string
  operating_note: string
  setup_complete: boolean
}

type LifecycleRow = {
  is_void?: boolean | null
  void_reason?: string | null
  voided_at?: string | null
  voided_by?: string | null
  corrected_by_record_type?: RecordKind | null
  corrected_by_record_id?: string | null
}

type ProductRow = {
  id: string
  name: string
  category: string
  stock: number | string
  reorder_point: number | string
  unit: string
  unit_cost: number | string
  selling_price: number | string
  icon_label: string | null
  created_at?: string | null
  updated_at?: string | null
}

type CustomerRow = {
  id: string
  name: string
  phone: string | null
  notes: string | null
  created_at?: string | null
  updated_at?: string | null
}

type SaleRow = LifecycleRow & {
  id: string
  customer_name: string
  total: number | string
  profit: number | string
  paid_amount: number | string
  balance_owed: number | string
  payment_method: PaymentMethod
  payment_status: 'paid' | 'partial' | 'owed'
  record_status: RecordStatus
  source: 'manual' | 'scan'
  occurred_at: string
  created_at: string
  sale_items?: Array<{
    product_id: string | null
    name: string
    quantity: number | string
    unit_price: number | string
    unit_cost: number | string
  }>
}

type ExpenseRow = LifecycleRow & {
  id: string
  label: string
  amount: number | string
  category: string
  payment_method: PaymentMethod
  record_status: RecordStatus
  source: 'manual' | 'scan'
  occurred_at: string
  created_at: string
}

type DebtRow = LifecycleRow & {
  id: string
  customer_id: string | null
  customer_name: string
  amount: number | string
  paid_amount: number | string
  last_activity: string | null
  record_status: RecordStatus
  created_at: string
}

type StockMovementRow = LifecycleRow & {
  id: string
  product_id: string | null
  product_name: string
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number | string
  unit: string
  unit_cost: number | string
  note: string | null
  record_status: RecordStatus
  created_at: string
}

type EvidenceRow = {
  id: string
  record_type: RecordKind
  record_id: string
  source: ScanSource
  image_path: string | null
  captured_at: string | null
}

type ScanDraftRow = {
  id: string
  source: ScanSource
  status: RecordStatus
  image_path: string | null
  file_name: string | null
  mime_type: string | null
  entry_type: RecordKind
  extracted_summary: string | null
  reviewed_record_type: RecordKind | null
  reviewed_record_id: string | null
  created_at: string
  reviewed_at: string | null
}

type ActivityRow = {
  id: string
  record_type: RecordKind | null
  record_id: string | null
  message: string
  amount: number | string | null
  record_status: RecordStatus
  created_at: string
}

export async function loadMarketWorkspace(userId: string): Promise<WorkspaceLoadResult> {
  assertSupabase()

  const { data: ownedBusiness, error: ownedError } = await supabase!
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<BusinessRow>()

  if (ownedError) throw ownedError

  let businessRow = ownedBusiness

  if (!businessRow) {
    const { data: membership, error: memberError } = await supabase!
      .from('business_members')
      .select('businesses(*)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle<{ businesses: BusinessRow | null }>()

    if (memberError) throw memberError
    businessRow = membership?.businesses ?? null
  }

  if (!businessRow) {
    return { business: null, records: cloneRecords(emptyRecords) }
  }

  return {
    business: mapBusiness(businessRow),
    records: await loadRecordsForBusiness(businessRow.id)
  }
}

export async function createBusinessWorkspace(setup: BusinessSetupDraft, userId: string): Promise<WorkspaceLoadResult> {
  assertSupabase()

  const { data: createdBusiness, error: businessError } = await supabase!
    .from('businesses')
    .insert({
      owner_id: userId,
      name: setup.name,
      business_type: setup.businessType,
      location: setup.location,
      currency: setup.currency,
      operating_note: defaultBusiness.operatingNote,
      setup_complete: true
    })
    .select('*')
    .single<BusinessRow>()

  if (businessError) throw businessError

  const { error: memberError } = await supabase!.from('business_members').insert({
    business_id: createdBusiness.id,
    user_id: userId,
    role: 'owner'
  })

  if (memberError) throw memberError

  return {
    business: mapBusiness(createdBusiness),
    records: cloneRecords(emptyRecords)
  }
}

export async function saveReviewedRecordToSupabase(input: SaveRecordInput): Promise<void> {
  assertSupabase()

  const payload = await buildSavePayload(input)
  const { error } = await supabase!.rpc('marketos_save_reviewed_record', {
    target_business_id: input.business.id,
    payload
  })

  if (error) throw error
}

export async function voidRecordInSupabase(businessId: string, recordType: RecordKind, recordId: string, reason: string): Promise<void> {
  assertSupabase()

  const { error } = await supabase!.rpc('marketos_void_record', {
    target_business_id: businessId,
    target_record_type: recordType,
    target_record_id: recordId,
    reason
  })

  if (error) throw error
}

export async function saveProductToSupabase(businessId: string, draft: ProductDraft): Promise<void> {
  assertSupabase()

  const payload = {
    business_id: businessId,
    name: draft.name.trim() || 'General item',
    category: draft.category.trim() || 'General',
    stock: parseMoney(draft.stock),
    reorder_point: parseMoney(draft.reorderPoint),
    unit: draft.unit.trim() || 'items',
    unit_cost: parseMoney(draft.unitCost),
    selling_price: parseMoney(draft.sellingPrice),
    icon_label: initialsFor(draft.name)
  }

  const request = draft.id
    ? supabase!.from('products').update(payload).eq('id', draft.id).eq('business_id', businessId)
    : supabase!.from('products').insert(payload)

  const { error } = await request
  if (error) throw error
}

export async function saveCustomerToSupabase(businessId: string, draft: CustomerDraft): Promise<void> {
  assertSupabase()

  const payload = {
    business_id: businessId,
    name: draft.name.trim() || 'Customer',
    phone: draft.phone.trim() || null,
    notes: draft.notes.trim() || null
  }

  const request = draft.id
    ? supabase!.from('customers').update(payload).eq('id', draft.id).eq('business_id', businessId)
    : supabase!.from('customers').insert(payload)

  const { error } = await request
  if (error) throw error
}

export async function createScanDraftInSupabase(input: CreateScanDraftInput): Promise<ScanDraft> {
  assertSupabase()

  const upload = await uploadEvidenceImage(input.business.id, `draft-${Date.now()}`, input.image.dataUrl)
  const image: CapturedImage = {
    ...input.image,
    storagePath: upload?.path,
    fileName: upload?.fileName,
    mimeType: upload?.mimeType
  }

  const { data, error } = await supabase!.rpc('marketos_create_scan_draft', {
    target_business_id: input.business.id,
    payload: {
      imagePath: upload?.path ?? null,
      fileName: upload?.fileName ?? null,
      mimeType: upload?.mimeType ?? null,
      source: input.image.source,
      capturedAt: input.image.capturedAt,
      entryType: 'sale',
      summary: 'Manual review required before saving.'
    }
  })

  if (error) throw error

  const draftId = typeof data === 'object' && data && 'draftId' in data ? String(data.draftId) : undefined
  const entry = {
    ...createDraftForKind('sale'),
    evidence: image,
    scanDraftId: draftId
  }

  return {
    id: draftId,
    image,
    entry,
    status: 'draft',
    imagePath: upload?.path,
    createdAt: new Date().toISOString()
  }
}

async function loadRecordsForBusiness(businessId: string): Promise<MarketRecords> {
  const [
    productsResult,
    customersResult,
    salesResult,
    expensesResult,
    debtsResult,
    stockResult,
    evidenceResult,
    scanDraftsResult,
    activityResult
  ] = await Promise.all([
    supabase!.from('products').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase!.from('customers').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase!
      .from('sales')
      .select('*, sale_items(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    supabase!.from('expenses').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase!.from('debts').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase!.from('stock_movements').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase!.from('transaction_evidence').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase!.from('scan_drafts').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
    supabase!.from('activity_log').select('*').eq('business_id', businessId).order('created_at', { ascending: false })
  ])

  const firstError = [
    productsResult.error,
    customersResult.error,
    salesResult.error,
    expensesResult.error,
    debtsResult.error,
    stockResult.error,
    evidenceResult.error,
    scanDraftsResult.error,
    activityResult.error
  ].find(Boolean)
  if (firstError) throw firstError

  const evidenceRows = (evidenceResult.data ?? []) as EvidenceRow[]
  const evidenceCountFor = (recordType: RecordKind, recordId: string) =>
    evidenceRows.filter((evidence) => evidence.record_type === recordType && evidence.record_id === recordId).length
  const scanDrafts = await mapScanDrafts((scanDraftsResult.data ?? []) as ScanDraftRow[])

  return {
    products: ((productsResult.data ?? []) as ProductRow[]).map(mapProduct),
    customers: ((customersResult.data ?? []) as CustomerRow[]).map(mapCustomer),
    sales: ((salesResult.data ?? []) as SaleRow[]).map((sale) => mapSale(sale, evidenceCountFor('sale', sale.id))),
    expenses: ((expensesResult.data ?? []) as ExpenseRow[]).map((expense) => ({
      id: expense.id,
      status: expense.record_status,
      source: expense.source,
      label: expense.label,
      amount: toNumber(expense.amount),
      category: expense.category,
      paymentMethod: expense.payment_method,
      evidenceCount: evidenceCountFor('expense', expense.id),
      time: formatRecordTime(expense.occurred_at),
      createdAt: expense.created_at,
      ...mapLifecycle(expense)
    })),
    debts: ((debtsResult.data ?? []) as DebtRow[]).map((debt) => ({
      id: debt.id,
      status: debt.record_status,
      customerId: debt.customer_id ?? slugify(debt.customer_name),
      customerName: debt.customer_name,
      initials: initialsFor(debt.customer_name),
      amount: toNumber(debt.amount),
      paidAmount: toNumber(debt.paid_amount),
      sinceLabel: `Owes since ${formatShortDate(debt.created_at)}`,
      lastActivity: debt.last_activity ?? 'Debt record',
      evidenceCount: evidenceCountFor('debt', debt.id),
      createdAt: debt.created_at,
      ...mapLifecycle(debt)
    })),
    stockMovements: ((stockResult.data ?? []) as StockMovementRow[]).map((movement) => ({
      id: movement.id,
      status: movement.record_status,
      productId: movement.product_id ?? slugify(movement.product_name),
      productName: movement.product_name,
      quantity: toNumber(movement.quantity),
      unit: movement.unit,
      unitCost: toNumber(movement.unit_cost),
      movementType: movement.movement_type,
      note: movement.note ?? '',
      evidenceCount: evidenceCountFor('stock', movement.id),
      createdAt: movement.created_at,
      ...mapLifecycle(movement)
    })),
    evidence: evidenceRows.map((evidence) => ({
      id: evidence.id,
      recordType: evidence.record_type,
      recordId: evidence.record_id,
      source: evidence.source,
      dataUrl: evidence.image_path ?? '',
      capturedAt: evidence.captured_at ?? new Date().toISOString()
    })),
    scanDrafts,
    activityLog: ((activityResult.data ?? []) as ActivityRow[]).map((activity) => ({
      id: activity.id,
      recordType: activity.record_type ?? 'setup',
      recordId: activity.record_id ?? activity.id,
      label: activity.message,
      amount: activity.amount === null ? undefined : toNumber(activity.amount),
      status: activity.record_status,
      createdAt: activity.created_at
    }))
  }
}

async function buildSavePayload({ business, entry, source }: SaveRecordInput) {
  let evidence = entry.evidence

  if (evidence?.dataUrl && !evidence.storagePath) {
    const upload = await uploadEvidenceImage(business.id, `${entry.type}-${Date.now()}`, evidence.dataUrl)
    evidence = {
      ...evidence,
      storagePath: upload?.path,
      fileName: upload?.fileName,
      mimeType: upload?.mimeType
    }
  }

  return {
    ...entry,
    source,
    quantity: parseMoney(entry.quantity).toString(),
    unitPrice: parseMoney(entry.unitPrice).toString(),
    unitCost: parseMoney(entry.unitCost).toString(),
    amount: parseMoney(entry.amount).toString(),
    paidAmount: parseMoney(entry.paidAmount).toString(),
    evidence: evidence
      ? {
          source: evidence.source,
          imagePath: evidence.storagePath,
          storagePath: evidence.storagePath,
          fileName: evidence.fileName,
          mimeType: evidence.mimeType,
          capturedAt: evidence.capturedAt
        }
      : undefined
  }
}

async function uploadEvidenceImage(businessId: string, namePrefix: string, dataUrl: string) {
  const parsed = dataUrlToBlob(dataUrl)
  if (!parsed) return null

  const extension = parsed.mimeType.split('/')[1] || 'jpg'
  const fileName = `${namePrefix}.${extension}`
  const path = `${businessId}/${fileName}`
  const { error } = await supabase!.storage.from('marketos-evidence').upload(path, parsed.blob, {
    contentType: parsed.mimeType,
    upsert: true
  })

  if (error) {
    console.warn('Evidence upload failed. Check the marketos-evidence storage bucket.', error.message)
    return null
  }

  return { path, fileName, mimeType: parsed.mimeType }
}

async function mapScanDrafts(rows: ScanDraftRow[]): Promise<PersistedScanDraft[]> {
  return Promise.all(
    rows.map(async (row) => {
      let imageUrl: string | undefined

      if (row.image_path) {
        const { data } = await supabase!.storage.from('marketos-evidence').createSignedUrl(row.image_path, 60 * 30)
        imageUrl = data?.signedUrl
      }

      return {
        id: row.id,
        source: row.source,
        status: row.status,
        imagePath: row.image_path ?? undefined,
        imageUrl,
        entryType: row.entry_type,
        extractedSummary: row.extracted_summary ?? undefined,
        reviewedRecordType: row.reviewed_record_type ?? undefined,
        reviewedRecordId: row.reviewed_record_id ?? undefined,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at ?? undefined
      }
    })
  )
}

function mapBusiness(row: BusinessRow): BusinessProfile {
  return {
    id: row.id,
    name: row.name,
    businessType: row.business_type,
    ownerName: defaultBusiness.ownerName,
    location: row.location ?? '',
    currency: 'NGN',
    operatingNote: row.operating_note,
    setupComplete: row.setup_complete
  }
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    stock: toNumber(row.stock),
    reorderPoint: toNumber(row.reorder_point),
    unit: row.unit,
    unitCost: toNumber(row.unit_cost),
    sellingPrice: toNumber(row.selling_price),
    iconLabel: row.icon_label ?? initialsFor(row.name),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  }
}

function mapCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    initials: initialsFor(row.name),
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  }
}

function mapSale(row: SaleRow, evidenceCount: number): Sale {
  const items: SaleItem[] = (row.sale_items ?? []).map((item) => ({
    productId: item.product_id ?? '',
    name: item.name,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unit_price),
    unitCost: toNumber(item.unit_cost)
  }))

  return {
    id: row.id,
    status: row.record_status,
    source: row.source,
    customerName: row.customer_name,
    items,
    total: toNumber(row.total),
    profit: toNumber(row.profit),
    paidAmount: toNumber(row.paid_amount),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    balanceOwed: toNumber(row.balance_owed) || undefined,
    evidenceCount,
    time: formatRecordTime(row.occurred_at),
    createdAt: row.created_at,
    ...mapLifecycle(row)
  }
}

function mapLifecycle(row: LifecycleRow): RecordLifecycle {
  return {
    isVoid: Boolean(row.is_void),
    voidReason: row.void_reason ?? undefined,
    voidedAt: row.voided_at ?? undefined,
    voidedBy: row.voided_by ?? undefined,
    correctedByRecordType: row.corrected_by_record_type ?? undefined,
    correctedByRecordId: row.corrected_by_record_id ?? undefined
  }
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) return null

  const mimeType = match[1]
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return { blob: new Blob([bytes], { type: mimeType }), mimeType }
}

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value)
}

function formatRecordTime(value: string) {
  return formatTime(new Date(value))
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date(value))
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

function assertSupabase() {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export function applyLocalRecord(records: MarketRecords, entry: ReviewEntryDraft, source: 'manual' | 'scan') {
  return applyReviewedRecord(records, entry, source)
}

export function applyLocalVoid(records: MarketRecords, recordType: RecordKind, recordId: string, reason: string) {
  return voidLocalRecord(records, recordType, recordId, reason)
}

export function applyLocalProduct(records: MarketRecords, draft: ProductDraft) {
  const next = cloneRecords(records)
  const product: Product = {
    id: draft.id || `product-${Date.now()}`,
    name: draft.name.trim() || 'General item',
    category: draft.category.trim() || 'General',
    stock: parseMoney(draft.stock),
    reorderPoint: parseMoney(draft.reorderPoint),
    unit: draft.unit.trim() || 'items',
    unitCost: parseMoney(draft.unitCost),
    sellingPrice: parseMoney(draft.sellingPrice),
    iconLabel: initialsFor(draft.name)
  }
  const existingIndex = next.products.findIndex((item) => item.id === product.id)
  if (existingIndex >= 0) next.products[existingIndex] = product
  else next.products.unshift(product)
  return next
}

export function applyLocalCustomer(records: MarketRecords, draft: CustomerDraft) {
  const next = cloneRecords(records)
  const customer: Customer = {
    id: draft.id || `customer-${Date.now()}`,
    name: draft.name.trim() || 'Customer',
    phone: draft.phone.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    initials: initialsFor(draft.name)
  }
  const existingIndex = next.customers.findIndex((item) => item.id === customer.id)
  if (existingIndex >= 0) next.customers[existingIndex] = customer
  else next.customers.unshift(customer)
  return next
}
