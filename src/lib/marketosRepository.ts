import { business as defaultBusiness, emptyRecords } from '../data/mockData'
import { supabase } from './supabase'
import { applyReviewedRecord, cloneRecords } from '../utils/records'
import { formatTime, parseMoney, parseQuantity } from '../utils/format'
import type {
  BusinessProfile,
  BusinessSetupDraft,
  MarketRecords,
  PaymentMethod,
  Product,
  RecordKind,
  RecordStatus,
  ReviewEntryDraft,
  Sale,
  SaleItem,
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

type BusinessRow = {
  id: string
  name: string
  business_type: string
  location: string | null
  currency: string
  operating_note: string
  setup_complete: boolean
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
}

type CustomerRow = {
  id: string
  name: string
  phone: string | null
  notes: string | null
}

type SaleRow = {
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

type ExpenseRow = {
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

type DebtRow = {
  id: string
  customer_id: string | null
  customer_name: string
  amount: number | string
  paid_amount: number | string
  last_activity: string | null
  record_status: RecordStatus
  created_at: string
}

type StockMovementRow = {
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

  if (input.entry.type === 'sale') {
    await saveSale(input)
    return
  }

  if (input.entry.type === 'expense') {
    await saveExpense(input)
    return
  }

  if (input.entry.type === 'stock') {
    await saveStock(input)
    return
  }

  await saveDebt(input)
}

async function loadRecordsForBusiness(businessId: string): Promise<MarketRecords> {
  const [productsResult, customersResult, salesResult, expensesResult, debtsResult, stockResult, evidenceResult, activityResult] =
    await Promise.all([
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
    activityResult.error
  ].find(Boolean)
  if (firstError) throw firstError

  const evidenceRows = (evidenceResult.data ?? []) as EvidenceRow[]
  const evidenceCountFor = (recordType: RecordKind, recordId: string) =>
    evidenceRows.filter((evidence) => evidence.record_type === recordType && evidence.record_id === recordId).length

  return {
    products: ((productsResult.data ?? []) as ProductRow[]).map(mapProduct),
    customers: ((customersResult.data ?? []) as CustomerRow[]).map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? undefined,
      notes: customer.notes ?? undefined,
      initials: initialsFor(customer.name)
    })),
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
      createdAt: expense.created_at
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
      createdAt: debt.created_at
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
      createdAt: movement.created_at
    })),
    evidence: evidenceRows.map((evidence) => ({
      id: evidence.id,
      recordType: evidence.record_type,
      recordId: evidence.record_id,
      source: evidence.source,
      dataUrl: evidence.image_path ?? '',
      capturedAt: evidence.captured_at ?? new Date().toISOString()
    })),
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

async function saveSale({ business, userId, entry, source }: SaveRecordInput) {
  const quantity = Math.max(parseQuantity(entry.quantity), 1)
  const unitPrice = parseMoney(entry.unitPrice) || parseMoney(entry.amount)
  const unitCost = parseMoney(entry.unitCost)
  const total = parseMoney(entry.amount) || quantity * unitPrice
  const paidAmount = Math.min(parseMoney(entry.paidAmount) || total, total)
  const balanceOwed = Math.max(total - paidAmount, 0)
  const status = entry.evidence ? 'evidence_attached' : 'recorded'
  const product = await findOrCreateProduct(business.id, entry.itemName, entry.stockUnit, unitCost, unitPrice)

  const { data: sale, error: saleError } = await supabase!
    .from('sales')
    .insert({
      business_id: business.id,
      customer_name: entry.customerName || 'Walk-in customer',
      total,
      profit: Math.max((unitPrice - unitCost) * quantity, 0),
      paid_amount: paidAmount,
      balance_owed: balanceOwed,
      payment_method: balanceOwed > 0 ? 'credit' : entry.paymentMethod,
      payment_status: balanceOwed <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'owed',
      record_status: status,
      source,
      created_by: userId
    })
    .select('id')
    .single<{ id: string }>()

  if (saleError) throw saleError

  const { error: itemError } = await supabase!.from('sale_items').insert({
    sale_id: sale.id,
    product_id: product.id,
    name: `${quantity} ${entry.itemName || product.name}`,
    quantity,
    unit_price: unitPrice,
    unit_cost: unitCost
  })
  if (itemError) throw itemError

  await supabase!
    .from('products')
    .update({ stock: Math.max(product.stock - quantity, 0), unit_cost: unitCost || product.unitCost, selling_price: unitPrice || product.sellingPrice })
    .eq('id', product.id)

  if (balanceOwed > 0) {
    const { error: debtError } = await supabase!.from('debts').insert({
      business_id: business.id,
      customer_name: entry.customerName || 'Customer',
      amount: balanceOwed,
      paid_amount: 0,
      last_activity: entry.itemName || entry.summary,
      record_status: status,
      source_record_id: sale.id,
      created_by: userId
    })
    if (debtError) throw debtError
  }

  await saveEvidenceIfPresent(business.id, userId, 'sale', sale.id, entry)
  await logActivity(business.id, userId, 'sale', sale.id, `Sale recorded for ${entry.customerName || 'Walk-in customer'}`, total, status)
}

async function saveExpense({ business, userId, entry, source }: SaveRecordInput) {
  const amount = parseMoney(entry.amount)
  const status = entry.evidence ? 'evidence_attached' : 'recorded'

  const { data: expense, error } = await supabase!
    .from('expenses')
    .insert({
      business_id: business.id,
      label: entry.itemName || entry.summary || 'Business expense',
      amount,
      category: entry.expenseCategory || 'Operations',
      payment_method: entry.paymentMethod,
      record_status: status,
      source,
      created_by: userId
    })
    .select('id')
    .single<{ id: string }>()

  if (error) throw error

  await saveEvidenceIfPresent(business.id, userId, 'expense', expense.id, entry)
  await logActivity(business.id, userId, 'expense', expense.id, `Expense recorded: ${entry.itemName || 'Business expense'}`, amount, status)
}

async function saveStock({ business, userId, entry }: SaveRecordInput) {
  const quantity = Math.max(parseQuantity(entry.quantity), 1)
  const unitCost = parseMoney(entry.unitCost)
  const status = entry.evidence ? 'evidence_attached' : 'recorded'
  const product = await findOrCreateProduct(business.id, entry.itemName, entry.stockUnit, unitCost, parseMoney(entry.unitPrice))

  await supabase!
    .from('products')
    .update({ stock: product.stock + quantity, unit_cost: unitCost || product.unitCost })
    .eq('id', product.id)

  const { data: movement, error } = await supabase!
    .from('stock_movements')
    .insert({
      business_id: business.id,
      product_id: product.id,
      product_name: product.name,
      movement_type: 'in',
      quantity,
      unit: product.unit,
      unit_cost: unitCost,
      note: entry.note || entry.summary,
      record_status: status,
      created_by: userId
    })
    .select('id')
    .single<{ id: string }>()

  if (error) throw error

  await saveEvidenceIfPresent(business.id, userId, 'stock', movement.id, entry)
  await logActivity(business.id, userId, 'stock', movement.id, `Stock added: ${product.name}`, quantity * unitCost, status)
}

async function saveDebt({ business, userId, entry }: SaveRecordInput) {
  const amount = parseMoney(entry.amount)
  const status = entry.evidence ? 'evidence_attached' : 'recorded'

  const { data: debt, error } = await supabase!
    .from('debts')
    .insert({
      business_id: business.id,
      customer_name: entry.customerName || 'Customer',
      amount,
      paid_amount: parseMoney(entry.paidAmount),
      last_activity: entry.itemName || entry.summary || 'Manual debt record',
      record_status: status,
      created_by: userId
    })
    .select('id')
    .single<{ id: string }>()

  if (error) throw error

  await saveEvidenceIfPresent(business.id, userId, 'debt', debt.id, entry)
  await logActivity(business.id, userId, 'debt', debt.id, `Debt recorded for ${entry.customerName || 'Customer'}`, amount, status)
}

async function findOrCreateProduct(businessId: string, name: string, unit: string, unitCost: number, sellingPrice: number): Promise<Product> {
  const productName = name || 'General item'
  const { data: existing, error: existingError } = await supabase!
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .ilike('name', productName)
    .limit(1)
    .maybeSingle<ProductRow>()

  if (existingError) throw existingError
  if (existing) return mapProduct(existing)

  const { data: created, error: createError } = await supabase!
    .from('products')
    .insert({
      business_id: businessId,
      name: productName,
      category: 'General',
      stock: 0,
      reorder_point: 5,
      unit: unit || 'items',
      unit_cost: unitCost,
      selling_price: sellingPrice || unitCost,
      icon_label: initialsFor(productName)
    })
    .select('*')
    .single<ProductRow>()

  if (createError) throw createError
  return mapProduct(created)
}

async function saveEvidenceIfPresent(
  businessId: string,
  userId: string,
  recordType: RecordKind,
  recordId: string,
  entry: ReviewEntryDraft
) {
  if (!entry.evidence) return

  const upload = await uploadEvidenceImage(businessId, recordType, recordId, entry.evidence.dataUrl)

  const { error } = await supabase!.from('transaction_evidence').insert({
    business_id: businessId,
    record_type: recordType,
    record_id: recordId,
    source: entry.evidence.source,
    image_path: upload?.path ?? null,
    file_name: upload?.fileName ?? null,
    mime_type: upload?.mimeType ?? null,
    uploaded_by: userId,
    captured_at: entry.evidence.capturedAt
  })

  if (error) throw error
}

async function uploadEvidenceImage(businessId: string, recordType: RecordKind, recordId: string, dataUrl: string) {
  const parsed = dataUrlToBlob(dataUrl)
  if (!parsed) return null

  const extension = parsed.mimeType.split('/')[1] || 'jpg'
  const fileName = `${recordType}-${recordId}-${Date.now()}.${extension}`
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

async function logActivity(
  businessId: string,
  userId: string,
  recordType: RecordKind,
  recordId: string,
  message: string,
  amount: number,
  status: RecordStatus
) {
  const { error } = await supabase!.from('activity_log').insert({
    business_id: businessId,
    actor_id: userId,
    action: 'record_saved',
    record_type: recordType,
    record_id: recordId,
    message,
    amount,
    record_status: status
  })

  if (error) throw error
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
    iconLabel: row.icon_label ?? initialsFor(row.name)
  }
}

function mapSale(row: SaleRow, evidenceCount: number): Sale {
  const items: SaleItem[] = (row.sale_items ?? []).map((item) => ({
    productId: item.product_id ?? '',
    name: item.name,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unit_price)
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
    createdAt: row.created_at
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
